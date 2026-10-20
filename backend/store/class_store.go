package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"sasake-backend/models"
)

type ClassStore interface {
	GetAll(ctx context.Context, activeOnly *bool, search string) ([]models.Class, error)
	GetByID(ctx context.Context, id string) (*models.Class, error)
	Create(ctx context.Context, input models.CreateClassInput) (*models.Class, error)
	Update(ctx context.Context, id string, input models.UpdateClassInput) (*models.Class, error)
	Delete(ctx context.Context, id string) error
	GetSchedules(ctx context.Context, classID string) ([]models.ClassSchedule, error)
	AddSchedule(ctx context.Context, classID string, input models.CreateScheduleInput) (*models.ClassSchedule, error)
	DeleteSchedule(ctx context.Context, scheduleID string) error
}

type PostgresClassStore struct {
	pool *pgxpool.Pool
}

func NewClassStore(pool *pgxpool.Pool) *PostgresClassStore {
	return &PostgresClassStore{pool: pool}
}

func (s *PostgresClassStore) GetAll(ctx context.Context, activeOnly *bool, search string) ([]models.Class, error) {
	query := `
		SELECT id, name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, COALESCE(class_type, 'group'), is_active, created_at
		FROM classes
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if activeOnly != nil {
		query += fmt.Sprintf(" AND is_active = $%d", argIdx)
		args = append(args, *activeOnly)
		argIdx++
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query += fmt.Sprintf(" AND (LOWER(name) LIKE $%d OR LOWER(COALESCE(description, '')) LIKE $%d OR LOWER(COALESCE(instructor_name, '')) LIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	query += " ORDER BY name ASC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query classes: %w", err)
	}
	defer rows.Close()

	var classes []models.Class
	for rows.Next() {
		var c models.Class
		if err := rows.Scan(
			&c.ID,
			&c.Name,
			&c.Description,
			&c.InstructorName,
			&c.Capacity,
			&c.CostPerSessionCents,
			&c.PriceCents,
			&c.BillingPeriod,
			&c.ClassType,
			&c.IsActive,
			&c.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan class row: %w", err)
		}
		classes = append(classes, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return classes, nil
}

func (s *PostgresClassStore) GetByID(ctx context.Context, id string) (*models.Class, error) {
	query := `
		SELECT id, name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, COALESCE(class_type, 'group'), is_active, created_at
		FROM classes
		WHERE id = $1
	`
	var c models.Class
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.Name,
		&c.Description,
		&c.InstructorName,
		&c.Capacity,
		&c.CostPerSessionCents,
		&c.PriceCents,
		&c.BillingPeriod,
		&c.ClassType,
		&c.IsActive,
		&c.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get class by id: %w", err)
	}

	return &c, nil
}

func (s *PostgresClassStore) Create(ctx context.Context, input models.CreateClassInput) (*models.Class, error) {
	capacity := 15
	if input.Capacity > 0 {
		capacity = input.Capacity
	}

	billingPeriod := models.BillingPeriodMonthly
	if input.BillingPeriod != nil && *input.BillingPeriod != "" {
		billingPeriod = *input.BillingPeriod
	}

	classType := models.ClassTypeGroup
	if input.ClassType != nil && (*input.ClassType == models.ClassTypeIndividual || *input.ClassType == models.ClassTypeGroup) {
		classType = *input.ClassType
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	query := `
		INSERT INTO classes (name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, class_type, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, class_type, is_active, created_at
	`

	var c models.Class
	err := s.pool.QueryRow(
		ctx,
		query,
		input.Name,
		input.Description,
		input.InstructorName,
		capacity,
		input.CostPerSessionCents,
		input.PriceCents,
		billingPeriod,
		classType,
		isActive,
	).Scan(
		&c.ID,
		&c.Name,
		&c.Description,
		&c.InstructorName,
		&c.Capacity,
		&c.CostPerSessionCents,
		&c.PriceCents,
		&c.BillingPeriod,
		&c.ClassType,
		&c.IsActive,
		&c.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert class: %w", err)
	}

	return &c, nil
}

func (s *PostgresClassStore) Update(ctx context.Context, id string, input models.UpdateClassInput) (*models.Class, error) {
	setClauses := []string{}
	args := []any{id}
	argIdx := 2

	if input.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *input.Name)
		argIdx++
	}
	if input.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *input.Description)
		argIdx++
	}
	if input.InstructorName != nil {
		setClauses = append(setClauses, fmt.Sprintf("instructor_name = $%d", argIdx))
		args = append(args, *input.InstructorName)
		argIdx++
	}
	if input.Capacity != nil {
		setClauses = append(setClauses, fmt.Sprintf("capacity = $%d", argIdx))
		args = append(args, *input.Capacity)
		argIdx++
	}
	if input.CostPerSessionCents != nil {
		setClauses = append(setClauses, fmt.Sprintf("cost_per_session_cents = $%d", argIdx))
		args = append(args, *input.CostPerSessionCents)
		argIdx++
	}
	if input.PriceCents != nil {
		setClauses = append(setClauses, fmt.Sprintf("price_cents = $%d", argIdx))
		args = append(args, *input.PriceCents)
		argIdx++
	}
	if input.BillingPeriod != nil {
		setClauses = append(setClauses, fmt.Sprintf("billing_period = $%d", argIdx))
		args = append(args, *input.BillingPeriod)
		argIdx++
	}
	if input.ClassType != nil {
		setClauses = append(setClauses, fmt.Sprintf("class_type = $%d", argIdx))
		args = append(args, *input.ClassType)
		argIdx++
	}
	if input.IsActive != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *input.IsActive)
		argIdx++
	}

	if len(setClauses) == 0 {
		return s.GetByID(ctx, id)
	}

	query := fmt.Sprintf(`
		UPDATE classes
		SET %s
		WHERE id = $1
		RETURNING id, name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, class_type, is_active, created_at
	`, strings.Join(setClauses, ", "))

	var c models.Class
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&c.ID,
		&c.Name,
		&c.Description,
		&c.InstructorName,
		&c.Capacity,
		&c.CostPerSessionCents,
		&c.PriceCents,
		&c.BillingPeriod,
		&c.ClassType,
		&c.IsActive,
		&c.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to update class: %w", err)
	}

	return &c, nil
}

func (s *PostgresClassStore) Delete(ctx context.Context, id string) error {
	cmdTag, err := s.pool.Exec(ctx, "DELETE FROM classes WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete class: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *PostgresClassStore) GetSchedules(ctx context.Context, classID string) ([]models.ClassSchedule, error) {
	query := `
		SELECT id, class_id, day_of_week, start_time::text, end_time::text, room
		FROM class_schedules
		WHERE class_id = $1
		ORDER BY day_of_week, start_time
	`
	rows, err := s.pool.Query(ctx, query, classID)
	if err != nil {
		return nil, fmt.Errorf("failed to query class schedules: %w", err)
	}
	defer rows.Close()

	var schedules []models.ClassSchedule
	for rows.Next() {
		var cs models.ClassSchedule
		if err := rows.Scan(
			&cs.ID,
			&cs.ClassID,
			&cs.DayOfWeek,
			&cs.StartTime,
			&cs.EndTime,
			&cs.Room,
		); err != nil {
			return nil, fmt.Errorf("failed to scan schedule row: %w", err)
		}
		schedules = append(schedules, cs)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("schedule rows error: %w", err)
	}

	return schedules, nil
}

func (s *PostgresClassStore) AddSchedule(ctx context.Context, classID string, input models.CreateScheduleInput) (*models.ClassSchedule, error) {
	query := `
		INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room)
		VALUES ($1, $2, $3::time, $4::time, $5)
		RETURNING id, class_id, day_of_week, start_time::text, end_time::text, room
	`
	var cs models.ClassSchedule
	err := s.pool.QueryRow(ctx, query, classID, input.DayOfWeek, input.StartTime, input.EndTime, input.Room).Scan(
		&cs.ID,
		&cs.ClassID,
		&cs.DayOfWeek,
		&cs.StartTime,
		&cs.EndTime,
		&cs.Room,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add schedule slot: %w", err)
	}

	return &cs, nil
}

func (s *PostgresClassStore) DeleteSchedule(ctx context.Context, scheduleID string) error {
	cmdTag, err := s.pool.Exec(ctx, "DELETE FROM class_schedules WHERE id = $1", scheduleID)
	if err != nil {
		return fmt.Errorf("failed to delete schedule: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
