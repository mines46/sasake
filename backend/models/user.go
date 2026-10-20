package models

import "time"

type UserRole string

const (
	RoleAdmin   UserRole = "admin"
	RoleTeacher UserRole = "teacher"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Role         UserRole  `json:"role"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type LoginInput struct {
	Email    string `json:"email,omitempty"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type CreateUserInput struct {
	Email    string   `json:"email"`
	Username string   `json:"username"`
	Password string   `json:"password"`
	FullName string   `json:"full_name"`
	Role     UserRole `json:"role"`
}

type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

