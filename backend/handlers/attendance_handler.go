package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type AttendanceHandler struct {
	store store.AttendanceStore
}

func NewAttendanceHandler(store store.AttendanceStore) *AttendanceHandler {
	return &AttendanceHandler{store: store}
}

// RegisterRoutes mounts attendance REST endpoints onto a chi.Router
func (h *AttendanceHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.GetClassAttendance)
	r.Post("/batch", h.RecordBatchAttendance)
	r.Get("/student/{studentId}", h.GetStudentAttendance)
	r.Get("/metrics/daily", h.GetDailyMetrics)
}

func (h *AttendanceHandler) GetClassAttendance(w http.ResponseWriter, r *http.Request) {
	classID := r.URL.Query().Get("class_id")
	date := r.URL.Query().Get("date")

	if classID == "" {
		writeJSONError(w, http.StatusBadRequest, "class_id query parameter is required")
		return
	}
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	records, err := h.store.GetByClassAndDate(r.Context(), classID, date)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to get class attendance: "+err.Error())
		return
	}

	if records == nil {
		records = []models.EnrichedAttendance{}
	}

	writeJSON(w, http.StatusOK, records)
}

func (h *AttendanceHandler) RecordBatchAttendance(w http.ResponseWriter, r *http.Request) {
	var input models.BatchAttendanceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	input.ClassID = strings.TrimSpace(input.ClassID)
	input.Date = strings.TrimSpace(input.Date)

	if input.ClassID == "" {
		writeJSONError(w, http.StatusBadRequest, "class_id is required")
		return
	}
	if input.Date == "" {
		writeJSONError(w, http.StatusBadRequest, "date is required (YYYY-MM-DD)")
		return
	}
	if len(input.Records) == 0 {
		writeJSONError(w, http.StatusBadRequest, "records array cannot be empty")
		return
	}

	for _, rec := range input.Records {
		if strings.TrimSpace(rec.StudentID) == "" {
			writeJSONError(w, http.StatusBadRequest, "student_id is required for each record")
			return
		}
		switch rec.Status {
		case models.AttendanceStatusPresent, models.AttendanceStatusAbsent, models.AttendanceStatusLate, models.AttendanceStatusExcused:
			// Valid
		default:
			writeJSONError(w, http.StatusBadRequest, "invalid attendance status '"+string(rec.Status)+"', must be present, absent, late, or excused")
			return
		}
	}

	if err := h.store.RecordBatch(r.Context(), input); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to record attendance: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message": "attendance recorded successfully",
		"date":    input.Date,
		"count":   len(input.Records),
	})
}

func (h *AttendanceHandler) GetStudentAttendance(w http.ResponseWriter, r *http.Request) {
	studentID := chi.URLParam(r, "studentId")
	if studentID == "" {
		writeJSONError(w, http.StatusBadRequest, "studentId path parameter is required")
		return
	}

	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	records, err := h.store.GetByStudent(r.Context(), studentID, startDate, endDate)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to get student attendance: "+err.Error())
		return
	}

	if records == nil {
		records = []models.Attendance{}
	}

	writeJSON(w, http.StatusOK, records)
}

func (h *AttendanceHandler) GetDailyMetrics(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")

	metrics, err := h.store.GetDailyMetrics(r.Context(), date)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to get attendance metrics: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, metrics)
}

