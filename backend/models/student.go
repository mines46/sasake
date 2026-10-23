package models

import (
	"time"
)

type StudentStatus string

const (
	StudentStatusActive    StudentStatus = "active"
	StudentStatusInactive  StudentStatus = "inactive"
	StudentStatusSuspended StudentStatus = "suspended"
)

// Student represents a student record matching database/schema.sql
type Student struct {
	ID            string        `json:"id"`
	FirstName     string        `json:"first_name"`
	LastName      string        `json:"last_name"`
	Email         string        `json:"email"`
	Phone         *string       `json:"phone,omitempty"`
	IsMinor       bool          `json:"is_minor"`
	GuardianName  *string       `json:"guardian_name,omitempty"`
	GuardianPhone *string       `json:"guardian_phone,omitempty"`
	CourseYear    *string       `json:"course_year,omitempty"`
	SchoolName    *string       `json:"school_name,omitempty"`
	Status        StudentStatus `json:"status"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// CreateStudentInput defines payloads to register a student
type CreateStudentInput struct {
	FirstName     string        `json:"first_name"`
	LastName      string        `json:"last_name"`
	Email         string        `json:"email"`
	Phone         *string       `json:"phone,omitempty"`
	IsMinor       *bool         `json:"is_minor,omitempty"`
	GuardianName  *string       `json:"guardian_name,omitempty"`
	GuardianPhone *string       `json:"guardian_phone,omitempty"`
	CourseYear    *string       `json:"course_year,omitempty"`
	SchoolName    *string       `json:"school_name,omitempty"`
	Status        StudentStatus `json:"status,omitempty"`
}

// UpdateStudentInput defines payloads to update student information
type UpdateStudentInput struct {
	FirstName     *string        `json:"first_name,omitempty"`
	LastName      *string        `json:"last_name,omitempty"`
	Email         *string        `json:"email,omitempty"`
	Phone         *string        `json:"phone,omitempty"`
	IsMinor       *bool          `json:"is_minor,omitempty"`
	GuardianName  *string        `json:"guardian_name,omitempty"`
	GuardianPhone *string        `json:"guardian_phone,omitempty"`
	CourseYear    *string        `json:"course_year,omitempty"`
	SchoolName    *string        `json:"school_name,omitempty"`
	Status        *StudentStatus `json:"status,omitempty"`
}
