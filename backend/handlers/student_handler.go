package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type StudentHandler struct {
	store store.StudentStore
}

func NewStudentHandler(store store.StudentStore) *StudentHandler {
	return &StudentHandler{store: store}
}

// RegisterRoutes mounts student REST endpoints onto a chi.Router
func (h *StudentHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.ListStudents)
	r.Post("/", h.CreateStudent)
	r.Get("/{id}", h.GetStudent)
	r.Put("/{id}", h.UpdateStudent)
	r.Delete("/{id}", h.DeleteStudent)
}

func (h *StudentHandler) ListStudents(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	students, err := h.store.GetAll(r.Context(), status, search)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to list students: "+err.Error())
		return
	}

	if students == nil {
		students = []models.Student{}
	}

	writeJSON(w, http.StatusOK, students)
}

func (h *StudentHandler) GetStudent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "student id is required")
		return
	}

	student, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "student not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to get student: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, student)
}

func (h *StudentHandler) CreateStudent(w http.ResponseWriter, r *http.Request) {
	var input models.CreateStudentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))

	if input.FirstName == "" || input.LastName == "" || input.Email == "" {
		writeJSONError(w, http.StatusBadRequest, "first_name, last_name, and email are required fields")
		return
	}

	student, err := h.store.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, store.ErrConflictEmail) {
			writeJSONError(w, http.StatusConflict, "a student with this email address already exists")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to create student: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, student)
}

func (h *StudentHandler) UpdateStudent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "student id is required")
		return
	}

	var input models.UpdateStudentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	student, err := h.store.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "student not found")
			return
		}
		if errors.Is(err, store.ErrConflictEmail) {
			writeJSONError(w, http.StatusConflict, "a student with this email address already exists")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to update student: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, student)
}

func (h *StudentHandler) DeleteStudent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "student id is required")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "student not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to delete student: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}

func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{"error": message})
}
