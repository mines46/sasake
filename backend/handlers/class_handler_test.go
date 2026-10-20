package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type mockClassStore struct {
	classes   map[string]models.Class
	schedules map[string][]models.ClassSchedule
}

func newMockClassStore() *mockClassStore {
	return &mockClassStore{
		classes:   make(map[string]models.Class),
		schedules: make(map[string][]models.ClassSchedule),
	}
}

func (m *mockClassStore) GetAll(ctx context.Context, activeOnly *bool, search string) ([]models.Class, error) {
	var list []models.Class
	for _, c := range m.classes {
		if activeOnly != nil && c.IsActive != *activeOnly {
			continue
		}
		if search != "" {
			q := strings.ToLower(search)
			if !strings.Contains(strings.ToLower(c.Name), q) {
				continue
			}
		}
		list = append(list, c)
	}
	return list, nil
}

func (m *mockClassStore) GetByID(ctx context.Context, id string) (*models.Class, error) {
	c, ok := m.classes[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	return &c, nil
}

func (m *mockClassStore) Create(ctx context.Context, input models.CreateClassInput) (*models.Class, error) {
	bp := models.BillingPeriodMonthly
	if input.BillingPeriod != nil {
		bp = *input.BillingPeriod
	}
	active := true
	if input.IsActive != nil {
		active = *input.IsActive
	}

	cls := models.Class{
		ID:                  "mock-cls-1",
		Name:                input.Name,
		Description:         input.Description,
		InstructorName:      input.InstructorName,
		Capacity:            input.Capacity,
		CostPerSessionCents: input.CostPerSessionCents,
		PriceCents:          input.PriceCents,
		BillingPeriod:       bp,
		IsActive:            active,
		CreatedAt:           time.Now(),
	}
	m.classes[cls.ID] = cls
	return &cls, nil
}

func (m *mockClassStore) Update(ctx context.Context, id string, input models.UpdateClassInput) (*models.Class, error) {
	c, ok := m.classes[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	if input.Name != nil {
		c.Name = *input.Name
	}
	if input.Capacity != nil {
		c.Capacity = *input.Capacity
	}
	if input.CostPerSessionCents != nil {
		c.CostPerSessionCents = *input.CostPerSessionCents
	}
	m.classes[id] = c
	return &c, nil
}

func (m *mockClassStore) Delete(ctx context.Context, id string) error {
	if _, ok := m.classes[id]; !ok {
		return store.ErrNotFound
	}
	delete(m.classes, id)
	return nil
}

func (m *mockClassStore) GetSchedules(ctx context.Context, classID string) ([]models.ClassSchedule, error) {
	return m.schedules[classID], nil
}

func (m *mockClassStore) AddSchedule(ctx context.Context, classID string, input models.CreateScheduleInput) (*models.ClassSchedule, error) {
	sched := models.ClassSchedule{
		ID:        "mock-sched-1",
		ClassID:   classID,
		DayOfWeek: input.DayOfWeek,
		StartTime: input.StartTime,
		EndTime:   input.EndTime,
		Room:      input.Room,
	}
	m.schedules[classID] = append(m.schedules[classID], sched)
	return &sched, nil
}

func (m *mockClassStore) DeleteSchedule(ctx context.Context, scheduleID string) error {
	for classID, list := range m.schedules {
		for i, s := range list {
			if s.ID == scheduleID {
				m.schedules[classID] = append(list[:i], list[i+1:]...)
				return nil
			}
		}
	}
	return store.ErrNotFound
}

func setupClassTestRouter(handler *ClassHandler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/classes", func(sub chi.Router) {
		handler.RegisterRoutes(sub)
	})
	return r
}

func TestClassHandler_CRUD(t *testing.T) {
	mockStore := newMockClassStore()
	handler := NewClassHandler(mockStore)
	router := setupClassTestRouter(handler)

	// 1. Create Class
	createBody := map[string]any{
		"name":                   "AP Calculus BC",
		"description":            "Advanced placement calculus",
		"instructor_name":        "Dr. Arthur Vance",
		"capacity":               16,
		"cost_per_session_cents": 2500, // $25.00
		"price_cents":            20000,
	}
	bodyBytes, _ := json.Marshal(createBody)

	req := httptest.NewRequest(http.MethodPost, "/api/classes", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
	}

	var created models.Class
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if created.CostPerSessionCents != 2500 {
		t.Errorf("expected cost_per_session_cents 2500, got %d", created.CostPerSessionCents)
	}

	// 2. Validation error - missing name
	invalidBody := map[string]any{
		"name":                   "",
		"cost_per_session_cents": 2500,
	}
	invalidBytes, _ := json.Marshal(invalidBody)
	req = httptest.NewRequest(http.MethodPost, "/api/classes", bytes.NewReader(invalidBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for empty name, got %d", rec.Code)
	}

	// 3. Validation error - negative cost_per_session_cents
	negCostBody := map[string]any{
		"name":                   "Robotics",
		"cost_per_session_cents": -100,
	}
	negCostBytes, _ := json.Marshal(negCostBody)
	req = httptest.NewRequest(http.MethodPost, "/api/classes", bytes.NewReader(negCostBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for negative cost_per_session, got %d", rec.Code)
	}

	// 4. Get by ID
	req = httptest.NewRequest(http.MethodGet, "/api/classes/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", rec.Code)
	}

	// 5. Update Class
	newCost := 3000
	updateBody := map[string]any{
		"cost_per_session_cents": newCost,
	}
	updateBytes, _ := json.Marshal(updateBody)
	req = httptest.NewRequest(http.MethodPut, "/api/classes/"+created.ID, bytes.NewReader(updateBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK for update, got %d", rec.Code)
	}

	var updated models.Class
	_ = json.Unmarshal(rec.Body.Bytes(), &updated)
	if updated.CostPerSessionCents != 3000 {
		t.Errorf("expected updated cost_per_session_cents 3000, got %d", updated.CostPerSessionCents)
	}

	// 6. Schedule slot management
	schedBody := map[string]any{
		"day_of_week": 2, // Tuesday
		"start_time":  "09:00:00",
		"end_time":    "10:30:00",
		"room":        "Lab 201",
	}
	schedBytes, _ := json.Marshal(schedBody)
	req = httptest.NewRequest(http.MethodPost, "/api/classes/"+created.ID+"/schedules", bytes.NewReader(schedBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201 Created for adding schedule, got %d", rec.Code)
	}

	// Get schedules
	req = httptest.NewRequest(http.MethodGet, "/api/classes/"+created.ID+"/schedules", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK for getting schedules, got %d", rec.Code)
	}

	var schedules []models.ClassSchedule
	_ = json.Unmarshal(rec.Body.Bytes(), &schedules)
	if len(schedules) != 1 {
		t.Errorf("expected 1 schedule slot, got %d", len(schedules))
	}

	// 7. Delete Class
	req = httptest.NewRequest(http.MethodDelete, "/api/classes/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204 No Content for delete, got %d", rec.Code)
	}

	// Verify not found after delete
	req = httptest.NewRequest(http.MethodGet, "/api/classes/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404 Not Found after delete, got %d", rec.Code)
	}
}
