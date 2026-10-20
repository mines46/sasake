package models

import (
	"time"
)

type BillingPeriod string

const (
	BillingPeriodHourly  BillingPeriod = "hourly"
	BillingPeriodMonthly BillingPeriod = "monthly"
	BillingPeriodCourse  BillingPeriod = "course"
)

type ClassType string

const (
	ClassTypeGroup      ClassType = "group"
	ClassTypeIndividual ClassType = "individual"
)

// Class represents a course / class record matching database/schema.sql
type Class struct {
	ID                  string        `json:"id"`
	Name                string        `json:"name"`
	Description         *string       `json:"description,omitempty"`
	InstructorName      *string       `json:"instructor_name,omitempty"`
	Capacity            int           `json:"capacity"`
	CostPerSessionCents int           `json:"cost_per_session_cents"`
	PriceCents          int           `json:"price_cents"`
	BillingPeriod       BillingPeriod `json:"billing_period"`
	ClassType           ClassType     `json:"class_type"`
	IsActive            bool          `json:"is_active"`
	CreatedAt           time.Time     `json:"created_at"`
}

// CreateClassInput defines payloads to create a new class
type CreateClassInput struct {
	Name                string         `json:"name"`
	Description         *string        `json:"description,omitempty"`
	InstructorName      *string        `json:"instructor_name,omitempty"`
	Capacity            int            `json:"capacity"`
	CostPerSessionCents int            `json:"cost_per_session_cents"`
	PriceCents          int            `json:"price_cents"`
	BillingPeriod       *BillingPeriod `json:"billing_period,omitempty"`
	ClassType           *ClassType     `json:"class_type,omitempty"`
	IsActive            *bool          `json:"is_active,omitempty"`
}

// UpdateClassInput defines payloads to update class information
type UpdateClassInput struct {
	Name                *string        `json:"name,omitempty"`
	Description         *string        `json:"description,omitempty"`
	InstructorName      *string        `json:"instructor_name,omitempty"`
	Capacity            *int           `json:"capacity,omitempty"`
	CostPerSessionCents *int           `json:"cost_per_session_cents,omitempty"`
	PriceCents          *int           `json:"price_cents,omitempty"`
	BillingPeriod       *BillingPeriod `json:"billing_period,omitempty"`
	ClassType           *ClassType     `json:"class_type,omitempty"`
	IsActive            *bool          `json:"is_active,omitempty"`
}

// ClassSchedule represents a weekly recurring slot
type ClassSchedule struct {
	ID        string  `json:"id"`
	ClassID   string  `json:"class_id"`
	DayOfWeek int     `json:"day_of_week"` // 1 = Monday, 7 = Sunday
	StartTime string  `json:"start_time"`  // e.g. "09:00:00"
	EndTime   string  `json:"end_time"`    // e.g. "10:30:00"
	Room      *string `json:"room,omitempty"`
}

// CreateScheduleInput defines payloads to add a schedule slot
type CreateScheduleInput struct {
	DayOfWeek int     `json:"day_of_week"`
	StartTime string  `json:"start_time"`
	EndTime   string  `json:"end_time"`
	Room      *string `json:"room,omitempty"`
}
