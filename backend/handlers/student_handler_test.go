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
	"sasake-backend/store"
)

// mockStudentStore is an in-memory test implementation of store.StudentStore
type mockStudentStore struct {
	students map[string]models.Student
}

func newMockStore() *mockStudentStore {
	return &mockStudentStore{
		students: make(map[string]models.Student),
	}
}

func (m *mockStudentStore) GetAll(ctx context.Context, status string, search string) ([]models.Student, error) {
	var list []models.Student
	for _, s := range m.students {
		if status != "" && status != "all" && string(s.Status) != status {
			continue
		}
		list = append(list, s)
	}
	return list, nil
}

func (m *mockStudentStore) GetByID(ctx context.Context, id string) (*models.Student, error) {
	s, ok := m.students[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	return &s, nil
}

func (m *mockStudentStore) Create(ctx context.Context, input models.CreateStudentInput) (*models.Student, error) {
	for _, s := range m.students {
		if s.Email == input.Email {
			return nil, store.ErrConflictEmail
		}
	}

	isMinor := false
	if input.IsMinor != nil {
		isMinor = *input.IsMinor
	}

	st := models.Student{
		ID:            "mock-uuid-1",
		FirstName:     input.FirstName,
		LastName:      input.LastName,
		Email:         input.Email,
		Phone:         input.Phone,
		IsMinor:       isMinor,
		GuardianName:  input.GuardianName,
		GuardianPhone: input.GuardianPhone,
		Status:        input.Status,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	m.students[st.ID] = st
	return &st, nil
}

func (m *mockStudentStore) Update(ctx context.Context, id string, input models.UpdateStudentInput) (*models.Student, error) {
	s, ok := m.students[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	if input.FirstName != nil {
		s.FirstName = *input.FirstName
	}
	if input.LastName != nil {
		s.LastName = *input.LastName
	}
	if input.Status != nil {
		s.Status = *input.Status
	}
	m.students[id] = s
	return &s, nil
}

func (m *mockStudentStore) Delete(ctx context.Context, id string) error {
	if _, ok := m.students[id]; !ok {
		return store.ErrNotFound
	}
	delete(m.students, id)
	return nil
}

func TestStudentHandler_CRUD(t *testing.T) {
	mockStore := newMockStore()
	handler := NewStudentHandler(mockStore)

	r := chi.NewRouter()
	r.Route("/api/students", func(sub chi.Router) {
		handler.RegisterRoutes(sub)
	})

	// 1. Test Create Student
	createPayload := []byte(`{
		"first_name": "Elena",
		"last_name": "Rostova",
		"email": "elena@example.com",
		"phone": "+1 555-0100",
		"guardian_name": "Mikhail Rostov",
		"guardian_phone": "+1 555-0101",
		"status": "active"
	}`)

	req := httptest.NewRequest("POST", "/api/students/", bytes.NewReader(createPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", w.Code, w.Body.String())
	}

	var created models.Student
	if err := json.Unmarshal(w.Body.Bytes(), &created); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if created.FirstName != "Elena" || created.Email != "elena@example.com" {
		t.Errorf("unexpected created student: %+v", created)
	}

	// 2. Test Conflict on Duplicate Email
	reqDup := httptest.NewRequest("POST", "/api/students/", bytes.NewReader(createPayload))
	reqDup.Header.Set("Content-Type", "application/json")
	wDup := httptest.NewRecorder()
	r.ServeHTTP(wDup, reqDup)

	if wDup.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict, got %d", wDup.Code)
	}

	// 3. Test Validation on Missing Email
	badPayload := []byte(`{"first_name": "John", "last_name": "Doe"}`)
	reqBad := httptest.NewRequest("POST", "/api/students/", bytes.NewReader(badPayload))
	wBad := httptest.NewRecorder()
	r.ServeHTTP(wBad, reqBad)

	if wBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request, got %d", wBad.Code)
	}

	// 4. Test List Students
	reqList := httptest.NewRequest("GET", "/api/students/", nil)
	wList := httptest.NewRecorder()
	r.ServeHTTP(wList, reqList)

	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", wList.Code)
	}

	var list []models.Student
	if err := json.Unmarshal(wList.Body.Bytes(), &list); err != nil {
		t.Fatalf("failed to parse list: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 student in list, got %d", len(list))
	}

	// 5. Test Get By ID
	reqGet := httptest.NewRequest("GET", "/api/students/mock-uuid-1", nil)
	wGet := httptest.NewRecorder()
	r.ServeHTTP(wGet, reqGet)

	if wGet.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", wGet.Code)
	}

	// 6. Test Delete
	reqDel := httptest.NewRequest("DELETE", "/api/students/mock-uuid-1", nil)
	wDel := httptest.NewRecorder()
	r.ServeHTTP(wDel, reqDel)

	if wDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204 No Content, got %d", wDel.Code)
	}
}
