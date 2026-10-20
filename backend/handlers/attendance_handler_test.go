package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
)

type mockAttendanceStore struct {
	records []models.Attendance
}

func newMockAttendanceStore() *mockAttendanceStore {
	return &mockAttendanceStore{
		records: make([]models.Attendance, 0),
	}
}

func (m *mockAttendanceStore) GetByClassAndDate(ctx context.Context, classID string, date string) ([]models.EnrichedAttendance, error) {
	var list []models.EnrichedAttendance
	for _, r := range m.records {
		if r.ClassID == classID && r.Date == date {
			list = append(list, models.EnrichedAttendance{
				Attendance:       r,
				StudentFirstName: "Test",
				StudentLastName:  "Student",
				StudentEmail:     "student@example.com",
			})
		}
	}
	return list, nil
}

func (m *mockAttendanceStore) GetByStudent(ctx context.Context, studentID string, startDate string, endDate string) ([]models.Attendance, error) {
	var list []models.Attendance
	for _, r := range m.records {
		if r.StudentID == studentID {
			if startDate != "" && r.Date < startDate {
				continue
			}
			if endDate != "" && r.Date > endDate {
				continue
			}
			list = append(list, r)
		}
	}
	return list, nil
}

func (m *mockAttendanceStore) RecordBatch(ctx context.Context, input models.BatchAttendanceInput) error {
	for _, rec := range input.Records {
		updated := false
		for i, existing := range m.records {
			if existing.StudentID == rec.StudentID && existing.ClassID == input.ClassID && existing.Date == input.Date {
				m.records[i].Status = rec.Status
				m.records[i].Notes = rec.Notes
				m.records[i].RecordedAt = time.Now()
				updated = true
				break
			}
		}
		if !updated {
			m.records = append(m.records, models.Attendance{
				ID:         "mock-att-" + rec.StudentID,
				StudentID:  rec.StudentID,
				ClassID:    input.ClassID,
				Date:       input.Date,
				Status:     rec.Status,
				Notes:      rec.Notes,
				RecordedAt: time.Now(),
			})
		}
	}
	return nil
}

func (m *mockAttendanceStore) GetDailyMetrics(ctx context.Context, date string) (*models.AttendanceSummary, error) {
	var present, late, excused, absent int
	for _, r := range m.records {
		if r.Date == date {
			switch r.Status {
			case models.AttendanceStatusPresent:
				present++
			case models.AttendanceStatusLate:
				late++
			case models.AttendanceStatusExcused:
				excused++
			case models.AttendanceStatusAbsent:
				absent++
			}
		}
	}
	total := present + late + excused + absent
	rate := 0.0
	if total > 0 {
		rate = float64(present+late) / float64(total) * 100
	}
	return &models.AttendanceSummary{
		Date:           date,
		TotalRecorded:  total,
		Present:        present,
		Late:           late,
		Excused:        excused,
		Absent:         absent,
		AttendanceRate: rate,
	}, nil
}

func setupAttendanceTestRouter(handler *AttendanceHandler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/attendance", func(sub chi.Router) {
		handler.RegisterRoutes(sub)
	})
	return r
}

func TestAttendanceHandler_BatchAndMetrics(t *testing.T) {
	store := newMockAttendanceStore()
	handler := NewAttendanceHandler(store)
	router := setupAttendanceTestRouter(handler)

	// 1. Batch record attendance for class c1 on 2026-10-17
	note := "Doctor excuse provided"
	batchBody := models.BatchAttendanceInput{
		ClassID: "c1",
		Date:    "2026-10-17",
		Records: []models.StudentAttendanceItem{
			{StudentID: "s1", Status: models.AttendanceStatusPresent},
			{StudentID: "s2", Status: models.AttendanceStatusLate},
			{StudentID: "s3", Status: models.AttendanceStatusAbsent}, // Unexcused absent -> Billed!
			{StudentID: "s4", Status: models.AttendanceStatusExcused, Notes: &note}, // Excused -> Waived!
		},
	}
	bodyBytes, _ := json.Marshal(batchBody)

	req := httptest.NewRequest(http.MethodPost, "/api/attendance/batch", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for batch attendance, got %d: %s", rec.Code, rec.Body.String())
	}

	// 2. Fetch class attendance for c1 on 2026-10-17
	req = httptest.NewRequest(http.MethodGet, "/api/attendance?class_id=c1&date=2026-10-17", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for get class attendance, got %d", rec.Code)
	}

	var classAtt []models.EnrichedAttendance
	if err := json.Unmarshal(rec.Body.Bytes(), &classAtt); err != nil {
		t.Fatalf("failed to decode class attendance: %v", err)
	}
	if len(classAtt) != 4 {
		t.Fatalf("expected 4 records, got %d", len(classAtt))
	}

	// 3. Validation: missing class_id
	req = httptest.NewRequest(http.MethodGet, "/api/attendance", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for missing class_id, got %d", rec.Code)
	}

	// 4. Validation: invalid status in batch
	badBatch := models.BatchAttendanceInput{
		ClassID: "c1",
		Date:    "2026-10-17",
		Records: []models.StudentAttendanceItem{
			{StudentID: "s1", Status: "invalid_status"},
		},
	}
	badBytes, _ := json.Marshal(badBatch)
	req = httptest.NewRequest(http.MethodPost, "/api/attendance/batch", bytes.NewReader(badBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for invalid status, got %d", rec.Code)
	}

	// 5. Get student attendance history for s3 (unexcused absent)
	req = httptest.NewRequest(http.MethodGet, "/api/attendance/student/s3?start_date=2026-10-01&end_date=2026-10-31", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for student attendance, got %d", rec.Code)
	}
	var s3Records []models.Attendance
	_ = json.Unmarshal(rec.Body.Bytes(), &s3Records)
	if len(s3Records) != 1 || s3Records[0].Status != models.AttendanceStatusAbsent {
		t.Errorf("expected 1 absent record for s3, got %+v", s3Records)
	}

	// 6. Get daily metrics for 2026-10-17
	req = httptest.NewRequest(http.MethodGet, "/api/attendance/metrics/daily?date=2026-10-17", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for daily metrics, got %d", rec.Code)
	}
	var metrics models.AttendanceSummary
	_ = json.Unmarshal(rec.Body.Bytes(), &metrics)
	if metrics.TotalRecorded != 4 {
		t.Errorf("expected 4 total recorded, got %d", metrics.TotalRecorded)
	}
	if metrics.Present != 1 || metrics.Late != 1 || metrics.Absent != 1 || metrics.Excused != 1 {
		t.Errorf("unexpected counts: %+v", metrics)
	}
}

