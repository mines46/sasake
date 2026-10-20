package models

import (
	"time"
)

type InvoiceStatus string

const (
	InvoiceStatusDraft     InvoiceStatus = "draft"
	InvoiceStatusPending   InvoiceStatus = "pending"
	InvoiceStatusPaid      InvoiceStatus = "paid"
	InvoiceStatusOverdue   InvoiceStatus = "overdue"
	InvoiceStatusCancelled InvoiceStatus = "cancelled"
)

// Invoice represents a tuition invoice / recibo matching database/schema.sql
type Invoice struct {
	ID            string        `json:"id"`
	InvoiceNumber string        `json:"invoice_number"`
	StudentID     string        `json:"student_id"`
	IssueDate     string        `json:"issue_date"` // YYYY-MM-DD
	DueDate       string        `json:"due_date"`   // YYYY-MM-DD
	SubtotalCents int           `json:"subtotal_cents"`
	DiscountCents int           `json:"discount_cents"`
	TotalCents    int           `json:"total_cents"`
	Status        InvoiceStatus `json:"status"`
	PaidAt        *time.Time    `json:"paid_at,omitempty"`
	Notes         *string       `json:"notes,omitempty"`
	CreatedAt     time.Time     `json:"created_at"`
}

// InvoiceItem represents an individual line item on an invoice
type InvoiceItem struct {
	ID                   string  `json:"id"`
	InvoiceID            string  `json:"invoice_id"`
	Description          string  `json:"description"`
	Quantity             int     `json:"quantity"` // Number of billable sessions
	UnitPriceCents       int     `json:"unit_price_cents"`
	TotalCents           int     `json:"total_cents"`
	ClassID              *string `json:"class_id,omitempty"`
	ClassType            *string `json:"class_type,omitempty"`        // "group" or "individual"
	IsAdvanceBilling     *bool   `json:"is_advance_billing,omitempty"` // true if billed in advance (group)
	PresentCount         *int    `json:"present_count,omitempty"`
	LateCount            *int    `json:"late_count,omitempty"`
	UnexcusedAbsentCount *int    `json:"unexcused_absent_count,omitempty"`
	ExcusedCount         *int    `json:"excused_count,omitempty"`
}

// EnrichedInvoice includes student demographic info and line items
type EnrichedInvoice struct {
	Invoice
	StudentName   string        `json:"student_name"`
	StudentEmail  string        `json:"student_email"`
	GuardianName  *string       `json:"guardian_name,omitempty"`
	GuardianPhone *string       `json:"guardian_phone,omitempty"`
	Items         []InvoiceItem `json:"items"`
}

// CalculateBillingInput request payload to preview attendance-driven tuition
type CalculateBillingInput struct {
	StudentID     string `json:"student_id"`
	StartDate     string `json:"start_date"` // YYYY-MM-DD
	EndDate       string `json:"end_date"`   // YYYY-MM-DD
	DiscountCents int    `json:"discount_cents"`
}

// ClassBillingBreakdown provides detailed attendance counts for a single enrolled class
type ClassBillingBreakdown struct {
	ClassID             string `json:"class_id"`
	ClassName           string `json:"class_name"`
	ClassType           string `json:"class_type"`        // "group" or "individual"
	IsAdvanceBilling    bool   `json:"is_advance_billing"` // true if billed in advance (group)
	CostPerSessionCents int    `json:"cost_per_session_cents"`
	PresentCount        int    `json:"present_count"`
	LateCount           int    `json:"late_count"`
	UnexcusedCount      int    `json:"unexcused_count"` // Billed as assisted!
	ExcusedCount        int    `json:"excused_count"`   // Waived ($0.00)
	BillableSessions    int    `json:"billable_sessions"`
	TotalCents          int    `json:"total_cents"`
}

// BillingCalculationResult output of the authoritative backend billing engine
type BillingCalculationResult struct {
	StudentID              string                  `json:"student_id"`
	StartDate              string                  `json:"start_date"`
	EndDate                string                  `json:"end_date"`
	ClassesBreakdown       []ClassBillingBreakdown `json:"classes_breakdown"`
	InvoiceItems           []InvoiceItem           `json:"invoice_items"`
	TotalBillableSessions  int                     `json:"total_billable_sessions"`
	TotalAttendedSessions  int                     `json:"total_attended_sessions"`
	TotalUnexcusedAbsences int                     `json:"total_unexcused_absences"`
	TotalExcusedAbsences   int                     `json:"total_excused_absences"`
	SubtotalCents          int                     `json:"subtotal_cents"`
	DiscountCents          int                     `json:"discount_cents"`
	TotalCents             int                     `json:"total_cents"`
}

// GenerateInvoiceInput creates and stores an invoice in PostgreSQL
type GenerateInvoiceInput struct {
	StudentID     string  `json:"student_id"`
	StartDate     string  `json:"start_date"` // YYYY-MM-DD
	EndDate       string  `json:"end_date"`   // YYYY-MM-DD
	DueDate       string  `json:"due_date"`   // YYYY-MM-DD
	DiscountCents int     `json:"discount_cents"`
	Notes         *string `json:"notes,omitempty"`
}

// UpdateInvoiceStatusInput allows changing payment status (e.g. mark paid)
type UpdateInvoiceStatusInput struct {
	Status InvoiceStatus `json:"status"`
	PaidAt *time.Time    `json:"paid_at,omitempty"`
}

// BatchGenerateInvoiceInput creates multiple invoices in a single transaction
type BatchGenerateInvoiceInput struct {
	StudentIDs    []string `json:"student_ids"`
	StartDate     string   `json:"start_date"` // YYYY-MM-DD
	EndDate       string   `json:"end_date"`   // YYYY-MM-DD
	DueDate       string   `json:"due_date"`   // YYYY-MM-DD
	DiscountCents int      `json:"discount_cents"`
	Notes         *string  `json:"notes,omitempty"`
}

