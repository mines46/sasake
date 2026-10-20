package models

import (
	"time"
)

type AttendanceStatus string

const (
	AttendanceStatusPresent AttendanceStatus = "present"
	AttendanceStatusAbsent  AttendanceStatus = "absent"
	AttendanceStatusLate    AttendanceStatus = "late"
	AttendanceStatusExcused AttendanceStatus = "excused"
)

// Attendance represents a record matching database/schema.sql
type Attendance struct {
	ID         string           `json:"id"`
	StudentID  string           `json:"student_id"`
	ClassID    string           `json:"class_id"`
	Date       string           `json:"date"` // Format: YYYY-MM-DD
	Status     AttendanceStatus `json:"status"`
	Notes      *string          `json:"notes,omitempty"`
	RecordedAt time.Time        `json:"recorded_at"`
}

// EnrichedAttendance includes student information for class roll-call
type EnrichedAttendance struct {
	Attendance
	StudentFirstName string  `json:"student_first_name"`
	StudentLastName  string  `json:"student_last_name"`
	StudentEmail     string  `json:"student_email"`
	ClassName        *string `json:"class_name,omitempty"`
}

// StudentAttendanceItem defines a single student's status in a batch submission
type StudentAttendanceItem struct {
	StudentID string           `json:"student_id"`
	Status    AttendanceStatus `json:"status"`
	Notes     *string          `json:"notes,omitempty"`
}

// BatchAttendanceInput payload for a teacher saving attendance for a whole class session
type BatchAttendanceInput struct {
	ClassID string                  `json:"class_id"`
	Date    string                  `json:"date"` // YYYY-MM-DD
	Records []StudentAttendanceItem `json:"records"`
}

// AttendanceSummary reports daily metrics for dashboards
type AttendanceSummary struct {
	Date           string  `json:"date"`
	TotalRecorded  int     `json:"total_recorded"`
	Present        int     `json:"present"`
	Late           int     `json:"late"`
	Excused        int     `json:"excused"`
	Absent         int     `json:"absent"`
	AttendanceRate float64 `json:"attendance_rate"`
}

