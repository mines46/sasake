package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type AuthHandler struct {
	userStore store.UserStore
}

func NewAuthHandler(userStore store.UserStore) *AuthHandler {
	return &AuthHandler{userStore: userStore}
}

// RegisterAuthRoutes mounts authentication routes at /api/auth
func (h *AuthHandler) RegisterAuthRoutes(r chi.Router) {
	r.Post("/login", h.Login)
	r.Get("/me", h.Me)
}

// RegisterUserRoutes mounts user administration routes at /api/users (admin only)
func (h *AuthHandler) RegisterUserRoutes(r chi.Router) {
	r.Get("/", h.ListUsers)
	r.Post("/", h.CreateUser)
	r.Delete("/{id}", h.DeleteUser)
}

func checkAdminRole(r *http.Request) bool {
	role := strings.ToLower(strings.TrimSpace(r.Header.Get("X-User-Role")))
	return role == "admin"
}

// Login authenticates a user requiring username and password
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input models.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	trimmedUsername := strings.TrimSpace(input.Username)
	if trimmedUsername == "" && strings.TrimSpace(input.Email) != "" {
		trimmedUsername = strings.TrimSpace(input.Email)
	}
	trimmedPassword := strings.TrimSpace(input.Password)

	if trimmedUsername == "" || trimmedPassword == "" {
		writeJSONError(w, http.StatusBadRequest, "Usuario y contraseña son requeridos para iniciar sesión")
		return
	}

	user, err := h.userStore.Authenticate(r.Context(), trimmedUsername, trimmedPassword)
	if err != nil {
		if errors.Is(err, store.ErrInvalidCredentials) {
			writeJSONError(w, http.StatusUnauthorized, "Credenciales incorrectas. Verifique usuario y contraseña.")
			return
		}
		if errors.Is(err, store.ErrUserInactive) {
			writeJSONError(w, http.StatusForbidden, "Esta cuenta de usuario ha sido desactivada.")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "Error al autenticar usuario: "+err.Error())
		return
	}

	tokenBytes := make([]byte, 24)
	_, _ = rand.Read(tokenBytes)
	token := "encina_sess_" + hex.EncodeToString(tokenBytes)

	writeJSON(w, http.StatusOK, models.AuthResponse{
		User:  *user,
		Token: token,
	})
}

// Me retrieves the current logged-in user details
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	if userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "No authenticated user session provided")
		return
	}

	user, err := h.userStore.GetByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "User not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve user: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// ListUsers retrieves all users (Admin only)
func (h *AuthHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if !checkAdminRole(r) {
		writeJSONError(w, http.StatusForbidden, "Acceso restringido: Solo el rol Administrador puede gestionar usuarios")
		return
	}

	users, err := h.userStore.GetAll(r.Context())
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to list users: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, users)
}

// CreateUser creates a new user (Admin only)
func (h *AuthHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if !checkAdminRole(r) {
		writeJSONError(w, http.StatusForbidden, "Acceso restringido: Solo el rol Administrador puede crear nuevos usuarios")
		return
	}

	var input models.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	input.Email = strings.TrimSpace(input.Email)
	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)
	input.FullName = strings.TrimSpace(input.FullName)

	if input.Email == "" {
		writeJSONError(w, http.StatusBadRequest, "El correo electrónico es obligatorio")
		return
	}
	if input.Username == "" {
		writeJSONError(w, http.StatusBadRequest, "El nombre de usuario es obligatorio")
		return
	}
	if input.Password == "" {
		writeJSONError(w, http.StatusBadRequest, "La contraseña es obligatoria")
		return
	}
	if len(input.Password) < 6 {
		writeJSONError(w, http.StatusBadRequest, "La contraseña debe tener al menos 6 caracteres")
		return
	}
	if input.Role != models.RoleAdmin && input.Role != models.RoleTeacher {
		input.Role = models.RoleTeacher
	}

	user, err := h.userStore.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, store.ErrConflictEmail) {
			writeJSONError(w, http.StatusConflict, "Ya existe un usuario con este correo electrónico")
			return
		}
		if errors.Is(err, store.ErrConflictUsername) {
			writeJSONError(w, http.StatusConflict, "Ya existe un usuario con este nombre de usuario")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "Error al crear usuario: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, user)
}

// DeleteUser deletes an existing user by ID (Admin only)
func (h *AuthHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if !checkAdminRole(r) {
		writeJSONError(w, http.StatusForbidden, "Acceso restringido: Solo el rol Administrador puede eliminar usuarios")
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	if err := h.userStore.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "User not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "Error al eliminar usuario: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

