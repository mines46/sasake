package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"sasake-backend/models"
)

type InvoiceStore interface {
	GetAll(ctx context.Context, status string, search string) ([]models.EnrichedInvoice, error)
	GetByID(ctx context.Context, id string) (*models.EnrichedInvoice, error)
	CalculateAttendanceBilling(ctx context.Context, input models.CalculateBillingInput) (*models.BillingCalculationResult, error)
	GenerateAttendanceInvoice(ctx context.Context, input models.GenerateInvoiceInput) (*models.EnrichedInvoice, error)
	GenerateBatchAttendanceInvoices(ctx context.Context, input models.BatchGenerateInvoiceInput) ([]models.EnrichedInvoice, error)
	UpdateStatus(ctx context.Context, id string, input models.UpdateInvoiceStatusInput) (*models.EnrichedInvoice, error)
	Delete(ctx context.Context, id string) error
}

type PostgresInvoiceStore struct {
	pool *pgxpool.Pool
}

func NewInvoiceStore(pool *pgxpool.Pool) *PostgresInvoiceStore {
	return &PostgresInvoiceStore{pool: pool}
}

func (s *PostgresInvoiceStore) GetAll(ctx context.Context, status string, search string) ([]models.EnrichedInvoice, error) {
	query := `
		SELECT 
			i.id, i.invoice_number, i.student_id, i.issue_date::text, i.due_date::text,
			i.subtotal_cents, i.discount_cents, i.total_cents, i.status, i.paid_at, i.notes, i.created_at,
			s.first_name, s.last_name, s.email, s.guardian_name, s.guardian_phone
		FROM invoices i
		JOIN students s ON i.student_id = s.id
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND i.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query += fmt.Sprintf(" AND (LOWER(i.invoice_number) LIKE $%d OR LOWER(s.first_name) LIKE $%d OR LOWER(s.last_name) LIKE $%d OR LOWER(s.email) LIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	query += " ORDER BY i.created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query invoices: %w", err)
	}
	defer rows.Close()

	var invoices []models.EnrichedInvoice
	for rows.Next() {
		var inv models.EnrichedInvoice
		var firstName, lastName string
		if err := rows.Scan(
			&inv.ID,
			&inv.InvoiceNumber,
			&inv.StudentID,
			&inv.IssueDate,
			&inv.DueDate,
			&inv.SubtotalCents,
			&inv.DiscountCents,
			&inv.TotalCents,
			&inv.Status,
			&inv.PaidAt,
			&inv.Notes,
			&inv.CreatedAt,
			&firstName,
			&lastName,
			&inv.StudentEmail,
			&inv.GuardianName,
			&inv.GuardianPhone,
		); err != nil {
			return nil, fmt.Errorf("failed to scan invoice row: %w", err)
		}
		inv.StudentName = fmt.Sprintf("%s %s", firstName, lastName)
		invoices = append(invoices, inv)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("invoice rows error: %w", err)
	}

	// Fetch items for all retrieved invoices
	for i := range invoices {
		items, err := s.getItemsByInvoiceID(ctx, invoices[i].ID)
		if err == nil {
			invoices[i].Items = items
		} else {
			invoices[i].Items = []models.InvoiceItem{}
		}
	}

	return invoices, nil
}

func (s *PostgresInvoiceStore) GetByID(ctx context.Context, id string) (*models.EnrichedInvoice, error) {
	query := `
		SELECT 
			i.id, i.invoice_number, i.student_id, i.issue_date::text, i.due_date::text,
			i.subtotal_cents, i.discount_cents, i.total_cents, i.status, i.paid_at, i.notes, i.created_at,
			s.first_name, s.last_name, s.email, s.guardian_name, s.guardian_phone
		FROM invoices i
		JOIN students s ON i.student_id = s.id
		WHERE i.id::text = $1 OR i.invoice_number = $1
	`
	var inv models.EnrichedInvoice
	var firstName, lastName string
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&inv.ID,
		&inv.InvoiceNumber,
		&inv.StudentID,
		&inv.IssueDate,
		&inv.DueDate,
		&inv.SubtotalCents,
		&inv.DiscountCents,
		&inv.TotalCents,
		&inv.Status,
		&inv.PaidAt,
		&inv.Notes,
		&inv.CreatedAt,
		&firstName,
		&lastName,
		&inv.StudentEmail,
		&inv.GuardianName,
		&inv.GuardianPhone,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get invoice: %w", err)
	}
	inv.StudentName = fmt.Sprintf("%s %s", firstName, lastName)

	items, err := s.getItemsByInvoiceID(ctx, inv.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get invoice items: %w", err)
	}
	inv.Items = items

	return &inv, nil
}

func (s *PostgresInvoiceStore) getItemsByInvoiceID(ctx context.Context, invoiceID string) ([]models.InvoiceItem, error) {
	query := `
		SELECT id, invoice_id, description, quantity, unit_price_cents, total_cents
		FROM invoice_items
		WHERE invoice_id = $1
		ORDER BY id ASC
	`
	rows, err := s.pool.Query(ctx, query, invoiceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.InvoiceItem
	for rows.Next() {
		var item models.InvoiceItem
		if err := rows.Scan(
			&item.ID,
			&item.InvoiceID,
			&item.Description,
			&item.Quantity,
			&item.UnitPriceCents,
			&item.TotalCents,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *PostgresInvoiceStore) CalculateAttendanceBilling(ctx context.Context, input models.CalculateBillingInput) (*models.BillingCalculationResult, error) {
	// Query attendance breakdown aggregated by class for active enrollments
	query := `
		SELECT 
			c.id AS class_id,
			c.name AS class_name,
			c.cost_per_session_cents,
			COALESCE(c.class_type, 'group') AS class_type,
			c.price_cents,
			COALESCE((
				SELECT COUNT(*)
				FROM generate_series($2::date, $3::date, '1 day'::interval) d
				JOIN class_schedules cs ON cs.class_id = c.id 
				                       AND cs.day_of_week = EXTRACT(ISODOW FROM d)
			), 0) AS scheduled_sessions_count,
			COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count,
			COUNT(a.id) FILTER (WHERE a.status = 'late') AS late_count,
			COUNT(a.id) FILTER (WHERE a.status = 'absent') AS unexcused_count,
			COUNT(a.id) FILTER (WHERE a.status = 'excused') AS excused_count
		FROM enrollments e
		JOIN classes c ON e.class_id = c.id
		LEFT JOIN attendance a ON a.student_id = e.student_id 
							   AND a.class_id = c.id 
							   AND a.date >= $2::date 
							   AND a.date <= $3::date
		WHERE e.student_id = $1 AND e.status = 'active'
		GROUP BY c.id, c.name, c.cost_per_session_cents, c.class_type, c.price_cents
		ORDER BY c.name ASC
	`

	rows, err := s.pool.Query(ctx, query, input.StudentID, input.StartDate, input.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate attendance billing: %w", err)
	}
	defer rows.Close()

	var breakdowns []models.ClassBillingBreakdown
	var invoiceItems []models.InvoiceItem
	totalBillableSessions := 0
	totalAttendedSessions := 0
	totalUnexcusedAbsences := 0
	totalExcusedAbsences := 0
	subtotalCents := 0

	for rows.Next() {
		var b models.ClassBillingBreakdown
		var classType string
		var priceCents int
		var scheduledSessionsCount int

		if err := rows.Scan(
			&b.ClassID,
			&b.ClassName,
			&b.CostPerSessionCents,
			&classType,
			&priceCents,
			&scheduledSessionsCount,
			&b.PresentCount,
			&b.LateCount,
			&b.UnexcusedCount,
			&b.ExcusedCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan class billing row: %w", err)
		}

		b.ClassType = classType
		isAdvance := (classType == "group")
		b.IsAdvanceBilling = isAdvance

		var desc string
		var attended int

		if isAdvance {
			// Group class: generated in advance, charges all sessions in the month
			sessions := scheduledSessionsCount
			if sessions <= 0 {
				if priceCents > 0 && b.CostPerSessionCents > 0 && priceCents%b.CostPerSessionCents == 0 {
					sessions = priceCents / b.CostPerSessionCents
				} else {
					sessions = 8 // Default standard monthly sessions
				}
			}
			b.BillableSessions = sessions
			b.TotalCents = b.BillableSessions * b.CostPerSessionCents
			// Reset attendance counts for advance billing representation
			b.PresentCount = 0
			b.LateCount = 0
			b.UnexcusedCount = 0
			b.ExcusedCount = 0

			desc = fmt.Sprintf("%s (Grupal) — Cuota mensual adelantada (%d sesiones)", b.ClassName, b.BillableSessions)
		} else {
			// Individual class: attendance-based billing
			attended = b.PresentCount + b.LateCount
			// CRITICAL RULE: Unexcused absences count as assisted and are billable!
			b.BillableSessions = attended + b.UnexcusedCount
			b.TotalCents = b.BillableSessions * b.CostPerSessionCents

			totalAttendedSessions += attended
			totalUnexcusedAbsences += b.UnexcusedCount
			totalExcusedAbsences += b.ExcusedCount

			desc = fmt.Sprintf("%s (Individual) — %d sesiones por asistencia (%d asistidas, %d falta sin justificar)", b.ClassName, b.BillableSessions, attended, b.UnexcusedCount)
		}

		totalBillableSessions += b.BillableSessions
		subtotalCents += b.TotalCents

		breakdowns = append(breakdowns, b)

		// Create line item representation
		pCount := b.PresentCount
		lCount := b.LateCount
		uCount := b.UnexcusedCount
		eCount := b.ExcusedCount
		cID := b.ClassID
		cType := classType

		invoiceItems = append(invoiceItems, models.InvoiceItem{
			Description:          desc,
			Quantity:             b.BillableSessions,
			UnitPriceCents:       b.CostPerSessionCents,
			TotalCents:           b.TotalCents,
			ClassID:              &cID,
			ClassType:            &cType,
			IsAdvanceBilling:     &isAdvance,
			PresentCount:         &pCount,
			LateCount:            &lCount,
			UnexcusedAbsentCount: &uCount,
			ExcusedCount:         &eCount,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("calculation rows error: %w", err)
	}

	discount := input.DiscountCents
	if discount < 0 {
		discount = 0
	}
	totalCents := subtotalCents - discount
	if totalCents < 0 {
		totalCents = 0
	}

	return &models.BillingCalculationResult{
		StudentID:              input.StudentID,
		StartDate:              input.StartDate,
		EndDate:                input.EndDate,
		ClassesBreakdown:       breakdowns,
		InvoiceItems:           invoiceItems,
		TotalBillableSessions:  totalBillableSessions,
		TotalAttendedSessions:  totalAttendedSessions,
		TotalUnexcusedAbsences: totalUnexcusedAbsences,
		TotalExcusedAbsences:   totalExcusedAbsences,
		SubtotalCents:          subtotalCents,
		DiscountCents:          discount,
		TotalCents:             totalCents,
	}, nil
}

func (s *PostgresInvoiceStore) GenerateAttendanceInvoice(ctx context.Context, input models.GenerateInvoiceInput) (*models.EnrichedInvoice, error) {
	calcResult, err := s.CalculateAttendanceBilling(ctx, models.CalculateBillingInput{
		StudentID:     input.StudentID,
		StartDate:     input.StartDate,
		EndDate:       input.EndDate,
		DiscountCents: input.DiscountCents,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to calculate billing: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// 1. Generate unique sequential invoice number: REC-YYYY-XXXX
	year := time.Now().Year()
	var count int
	_ = tx.QueryRow(ctx, "SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1", fmt.Sprintf("REC-%d-%%", year)).Scan(&count)
	invoiceNumber := fmt.Sprintf("REC-%d-%04d", year, count+1)

	// 2. Insert invoice
	dueDate := input.DueDate
	if dueDate == "" {
		dueDate = time.Now().AddDate(0, 0, 10).Format("2006-01-02")
	}

	insertInvoiceQuery := `
		INSERT INTO invoices (invoice_number, student_id, issue_date, due_date, subtotal_cents, discount_cents, total_cents, status, notes)
		VALUES ($1, $2, CURRENT_DATE, $3::date, $4, $5, $6, 'pending', $7)
		RETURNING id, invoice_number, student_id, issue_date::text, due_date::text, subtotal_cents, discount_cents, total_cents, status, paid_at, notes, created_at
	`
	var inv models.EnrichedInvoice
	err = tx.QueryRow(
		ctx,
		insertInvoiceQuery,
		invoiceNumber,
		input.StudentID,
		dueDate,
		calcResult.SubtotalCents,
		calcResult.DiscountCents,
		calcResult.TotalCents,
		input.Notes,
	).Scan(
		&inv.ID,
		&inv.InvoiceNumber,
		&inv.StudentID,
		&inv.IssueDate,
		&inv.DueDate,
		&inv.SubtotalCents,
		&inv.DiscountCents,
		&inv.TotalCents,
		&inv.Status,
		&inv.PaidAt,
		&inv.Notes,
		&inv.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert invoice: %w", err)
	}

	// 3. Insert invoice line items
	insertItemQuery := `
		INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, total_cents)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, invoice_id, description, quantity, unit_price_cents, total_cents
	`
	var items []models.InvoiceItem
	for _, it := range calcResult.InvoiceItems {
		var savedItem models.InvoiceItem
		err := tx.QueryRow(
			ctx,
			insertItemQuery,
			inv.ID,
			it.Description,
			it.Quantity,
			it.UnitPriceCents,
			it.TotalCents,
		).Scan(
			&savedItem.ID,
			&savedItem.InvoiceID,
			&savedItem.Description,
			&savedItem.Quantity,
			&savedItem.UnitPriceCents,
			&savedItem.TotalCents,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert invoice item: %w", err)
		}
		items = append(items, savedItem)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit invoice transaction: %w", err)
	}

	// 4. Enrich with student information
	return s.GetByID(ctx, inv.ID)
}

func (s *PostgresInvoiceStore) UpdateStatus(ctx context.Context, id string, input models.UpdateInvoiceStatusInput) (*models.EnrichedInvoice, error) {
	paidAt := input.PaidAt
	if input.Status == models.InvoiceStatusPaid && paidAt == nil {
		now := time.Now()
		paidAt = &now
	}

	query := `
		UPDATE invoices
		SET status = $1, paid_at = $2
		WHERE id = $3
		RETURNING id
	`
	var updatedID string
	err := s.pool.QueryRow(ctx, query, input.Status, paidAt, id).Scan(&updatedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to update invoice status: %w", err)
	}

	return s.GetByID(ctx, id)
}

func (s *PostgresInvoiceStore) Delete(ctx context.Context, id string) error {
	cmdTag, err := s.pool.Exec(ctx, "DELETE FROM invoices WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete invoice: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresInvoiceStore) GenerateBatchAttendanceInvoices(ctx context.Context, input models.BatchGenerateInvoiceInput) ([]models.EnrichedInvoice, error) {
	var results []models.EnrichedInvoice
	for _, studentID := range input.StudentIDs {
		inv, err := s.GenerateAttendanceInvoice(ctx, models.GenerateInvoiceInput{
			StudentID:     studentID,
			StartDate:     input.StartDate,
			EndDate:       input.EndDate,
			DueDate:       input.DueDate,
			DiscountCents: input.DiscountCents,
			Notes:         input.Notes,
		})
		if err != nil {
			return nil, fmt.Errorf("failed generating invoice for student %s: %w", studentID, err)
		}
		results = append(results, *inv)
	}
	return results, nil
}

