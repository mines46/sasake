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
	"sasake-backend/utils"
)

type mockUserStore struct {
	users map[string]models.User
}

func newMockUserStore() *mockUserStore {
	m := &mockUserStore{
		users: make(map[string]models.User),
	}

	adminHash, _ := utils.HashPassword("admin123")
	teacherHash, _ := utils.HashPassword("profesor123")
	deactivatedHash, _ := utils.HashPassword("secret123")

	m.users["usr-admin"] = models.User{
		ID:           "usr-admin",
		Email:        "admin@encina.com",
		Username:     "admin",
		PasswordHash: adminHash,
		FullName:     "Administrador Encina",
		Role:         models.RoleAdmin,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	m.users["usr-teacher"] = models.User{
		ID:           "usr-teacher",
		Email:        "profesor@encina.com",
		Username:     "profesor",
		PasswordHash: teacherHash,
		FullName:     "Profesor Encina",
		Role:         models.RoleTeacher,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	m.users["usr-inactive"] = models.User{
		ID:           "usr-inactive",
		Email:        "inactive@encina.com",
		Username:     "inactive",
		PasswordHash: deactivatedHash,
		FullName:     "Inactive User",
		Role:         models.RoleTeacher,
		IsActive:     false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	return m
}

func (m *mockUserStore) Authenticate(ctx context.Context, username, password string) (*models.User, error) {
	for _, u := range m.users {
		if strings.EqualFold(u.Username, username) || strings.EqualFold(u.Email, username) {
			if !u.IsActive {
				return nil, store.ErrUserInactive
			}
			if !utils.CheckPassword(password, u.PasswordHash) {
				return nil, store.ErrInvalidCredentials
			}
			return &u, nil
		}
	}
	return nil, store.ErrInvalidCredentials
}

func (m *mockUserStore) GetAll(ctx context.Context) ([]models.User, error) {
	var list []models.User
	for _, u := range m.users {
		list = append(list, u)
	}
	return list, nil
}

func (m *mockUserStore) GetByID(ctx context.Context, id string) (*models.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	return &u, nil
}

func (m *mockUserStore) Create(ctx context.Context, input models.CreateUserInput) (*models.User, error) {
	for _, u := range m.users {
		if u.Email == input.Email {
			return nil, store.ErrConflictEmail
		}
		if u.Username == input.Username {
			return nil, store.ErrConflictUsername
		}
	}

	hash, _ := utils.HashPassword(input.Password)
	id := "usr-" + input.Username
	u := models.User{
		ID:           id,
		Email:        input.Email,
		Username:     input.Username,
		PasswordHash: hash,
		FullName:     input.FullName,
		Role:         input.Role,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	m.users[id] = u
	return &u, nil
}

func (m *mockUserStore) Update(ctx context.Context, id string, input models.UpdateUserInput) (*models.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, store.ErrNotFound
	}

	if input.Email != nil && *input.Email != u.Email {
		for otherID, other := range m.users {
			if otherID != id && other.Email == *input.Email {
				return nil, store.ErrConflictEmail
			}
		}
		u.Email = *input.Email
	}

	if input.Username != nil && *input.Username != u.Username {
		for otherID, other := range m.users {
			if otherID != id && other.Username == *input.Username {
				return nil, store.ErrConflictUsername
			}
		}
		u.Username = *input.Username
	}

	if input.FullName != nil {
		u.FullName = *input.FullName
	}

	if input.Role != nil {
		u.Role = *input.Role
	}

	if input.IsActive != nil {
		u.IsActive = *input.IsActive
	}

	if input.Password != nil && *input.Password != "" {
		hash, _ := utils.HashPassword(*input.Password)
		u.PasswordHash = hash
	}

	u.UpdatedAt = time.Now()
	m.users[id] = u
	return &u, nil
}

func (m *mockUserStore) Delete(ctx context.Context, id string) error {
	if _, ok := m.users[id]; !ok {
		return store.ErrNotFound
	}
	delete(m.users, id)
	return nil
}

func (m *mockUserStore) SeedDefaultUsers(ctx context.Context) error {
	return nil
}

func TestAuthHandler_LoginFlow(t *testing.T) {
	mockStore := newMockUserStore()
	handler := NewAuthHandler(mockStore)

	r := chi.NewRouter()
	r.Route("/api/auth", func(sub chi.Router) {
		handler.RegisterAuthRoutes(sub)
	})

	// 1. Missing fields should fail
	badBody, _ := json.Marshal(map[string]string{
		"username": "admin",
		// missing password
	})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(badBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request, got %d: %s", rec.Code, rec.Body.String())
	}

	// 2. Incorrect password should fail
	wrongPassBody, _ := json.Marshal(models.LoginInput{
		Username: "admin",
		Password: "wrongpassword",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(wrongPassBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d: %s", rec.Code, rec.Body.String())
	}

	// 3. Deactivated account should fail
	inactiveBody, _ := json.Marshal(models.LoginInput{
		Username: "inactive",
		Password: "secret123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(inactiveBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden, got %d: %s", rec.Code, rec.Body.String())
	}

	// 4. Correct credentials (Username + Password) succeeds
	validBody, _ := json.Marshal(models.LoginInput{
		Username: "admin",
		Password: "admin123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(validBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var authResp models.AuthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &authResp); err != nil {
		t.Fatalf("failed to decode auth response: %v", err)
	}

	if authResp.User.Email != "admin@encina.com" || authResp.User.Role != models.RoleAdmin {
		t.Fatalf("unexpected user returned: %+v", authResp.User)
	}
	if authResp.Token == "" {
		t.Fatalf("expected non-empty token")
	}
}

func TestAuthHandler_RBAC_UserManagement(t *testing.T) {
	mockStore := newMockUserStore()
	handler := NewAuthHandler(mockStore)

	r := chi.NewRouter()
	r.Route("/api/users", func(sub chi.Router) {
		handler.RegisterUserRoutes(sub)
	})

	// 1. Teacher or unauthenticated access to /api/users should be forbidden
	req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
	req.Header.Set("X-User-Role", "teacher")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for teacher, got %d", rec.Code)
	}

	// 2. Admin access to /api/users succeeds
	req = httptest.NewRequest(http.MethodGet, "/api/users", nil)
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for admin, got %d: %s", rec.Code, rec.Body.String())
	}

	var users []models.User
	if err := json.Unmarshal(rec.Body.Bytes(), &users); err != nil {
		t.Fatalf("failed to decode users list: %v", err)
	}
	if len(users) != 3 {
		t.Fatalf("expected 3 users, got %d", len(users))
	}

	// 3. Admin creates new user
	newUserInput := models.CreateUserInput{
		Email:    "newprof@encina.com",
		Username: "newprof",
		Password: "password123",
		FullName: "Nuevo Profesor",
		Role:     models.RoleTeacher,
	}
	newBody, _ := json.Marshal(newUserInput)
	req = httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewReader(newBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
	}

	// 4. Duplicate email rejected with 409 Conflict
	req = httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewReader(newBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict for duplicate email, got %d: %s", rec.Code, rec.Body.String())
	}

	// 5. Admin deletes user
	req = httptest.NewRequest(http.MethodDelete, "/api/users/usr-newprof", nil)
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 No Content, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthHandler_RBAC_UpdateUser(t *testing.T) {
	mockStore := newMockUserStore()
	handler := NewAuthHandler(mockStore)

	r := chi.NewRouter()
	r.Route("/api/users", func(sub chi.Router) {
		handler.RegisterUserRoutes(sub)
	})

	// 1. Non-admin cannot update user
	updateBody, _ := json.Marshal(models.UpdateUserInput{
		FullName: func() *string { s := "New Name"; return &s }(),
	})
	req := httptest.NewRequest(http.MethodPut, "/api/users/usr-teacher", bytes.NewReader(updateBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "teacher")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for non-admin, got %d", rec.Code)
	}

	// 2. Admin can update own admin account (full name, email, new password)
	newAdminName := "Super Admin Updated"
	newAdminPass := "newadminpass123"
	adminUpdateBody, _ := json.Marshal(models.UpdateUserInput{
		FullName: &newAdminName,
		Password: &newAdminPass,
	})
	req = httptest.NewRequest(http.MethodPut, "/api/users/usr-admin", bytes.NewReader(adminUpdateBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var updatedAdmin models.User
	if err := json.Unmarshal(rec.Body.Bytes(), &updatedAdmin); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if updatedAdmin.FullName != newAdminName {
		t.Fatalf("expected full_name %q, got %q", newAdminName, updatedAdmin.FullName)
	}

	// Verify updated password works for login
	authRes, err := mockStore.Authenticate(context.Background(), "admin", newAdminPass)
	if err != nil || authRes == nil {
		t.Fatalf("failed to authenticate with newly updated password: %v", err)
	}

	// 3. Password shorter than 6 characters fails with 400
	shortPass := "123"
	badUpdateBody, _ := json.Marshal(models.UpdateUserInput{
		Password: &shortPass,
	})
	req = httptest.NewRequest(http.MethodPut, "/api/users/usr-admin", bytes.NewReader(badUpdateBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for short password, got %d", rec.Code)
	}

	// 4. Update non-existent user returns 404
	req = httptest.NewRequest(http.MethodPut, "/api/users/usr-nonexistent", bytes.NewReader(updateBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 Not Found, got %d", rec.Code)
	}
}

