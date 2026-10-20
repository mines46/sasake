package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type ClassHandler struct {
	store store.ClassStore
}

func NewClassHandler(store store.ClassStore) *ClassHandler {
	return &ClassHandler{store: store}
}

// RegisterRoutes mounts class REST endpoints onto a chi.Router
func (h *ClassHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.ListClasses)
	r.Post("/", h.CreateClass)
	r.Get("/{id}", h.GetClass)
	r.Put("/{id}", h.UpdateClass)
	r.Delete("/{id}", h.DeleteClass)

	// Nested schedule routes
	r.Get("/{id}/schedules", h.GetClassSchedules)
	r.Post("/{id}/schedules", h.AddClassSchedule)
	r.Delete("/{id}/schedules/{scheduleId}", h.DeleteClassSchedule)
}

func (h *ClassHandler) ListClasses(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	activeParam := r.URL.Query().Get("active")

	var activeOnly *bool
	if activeParam != "" {
		if val, err := strconv.ParseBool(activeParam); err == nil {
			activeOnly = &val
		}
	}

	classes, err := h.store.GetAll(r.Context(), activeOnly, search)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to list classes: "+err.Error())
		return
	}

	if classes == nil {
		classes = []models.Class{}
	}

	writeJSON(w, http.StatusOK, classes)
}

func (h *ClassHandler) GetClass(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "class id is required")
		return
	}

	c, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "class not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to get class: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, c)
}

func (h *ClassHandler) CreateClass(w http.ResponseWriter, r *http.Request) {
	var input models.CreateClassInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		writeJSONError(w, http.StatusBadRequest, "class name is required")
		return
	}

	if input.Capacity < 0 {
		writeJSONError(w, http.StatusBadRequest, "capacity cannot be negative")
		return
	}

	if input.CostPerSessionCents < 0 {
		writeJSONError(w, http.StatusBadRequest, "cost_per_session_cents cannot be negative")
		return
	}

	c, err := h.store.Create(r.Context(), input)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create class: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, c)
}

func (h *ClassHandler) UpdateClass(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "class id is required")
		return
	}

	var input models.UpdateClassInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if input.Name != nil {
		trimmed := strings.TrimSpace(*input.Name)
		if trimmed == "" {
			writeJSONError(w, http.StatusBadRequest, "class name cannot be empty")
			return
		}
		input.Name = &trimmed
	}

	if input.Capacity != nil && *input.Capacity <= 0 {
		writeJSONError(w, http.StatusBadRequest, "capacity must be greater than 0")
		return
	}

	if input.CostPerSessionCents != nil && *input.CostPerSessionCents < 0 {
		writeJSONError(w, http.StatusBadRequest, "cost_per_session_cents cannot be negative")
		return
	}

	c, err := h.store.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "class not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to update class: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, c)
}

func (h *ClassHandler) DeleteClass(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "class id is required")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "class not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to delete class: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ClassHandler) GetClassSchedules(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "class id is required")
		return
	}

	schedules, err := h.store.GetSchedules(r.Context(), id)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to get schedules: "+err.Error())
		return
	}

	if schedules == nil {
		schedules = []models.ClassSchedule{}
	}

	writeJSON(w, http.StatusOK, schedules)
}

func (h *ClassHandler) AddClassSchedule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "class id is required")
		return
	}

	var input models.CreateScheduleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if input.DayOfWeek < 1 || input.DayOfWeek > 7 {
		writeJSONError(w, http.StatusBadRequest, "day_of_week must be between 1 and 7")
		return
	}

	input.StartTime = strings.TrimSpace(input.StartTime)
	input.EndTime = strings.TrimSpace(input.EndTime)
	if input.StartTime == "" || input.EndTime == "" {
		writeJSONError(w, http.StatusBadRequest, "start_time and end_time are required")
		return
	}

	schedule, err := h.store.AddSchedule(r.Context(), id, input)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to add schedule: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, schedule)
}

func (h *ClassHandler) DeleteClassSchedule(w http.ResponseWriter, r *http.Request) {
	scheduleId := chi.URLParam(r, "scheduleId")
	if scheduleId == "" {
		writeJSONError(w, http.StatusBadRequest, "schedule id is required")
		return
	}

	if err := h.store.DeleteSchedule(r.Context(), scheduleId); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "schedule not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to delete schedule: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
