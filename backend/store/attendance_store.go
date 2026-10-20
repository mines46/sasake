package store

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"sasake-backend/models"
)

type AttendanceStore interface {
	GetByClassAndDate(ctx context.Context, classID string, date string) ([]models.EnrichedAttendance, error)
	GetByStudent(ctx context.Context, studentID string, startDate string, endDate string) ([]models.Attendance, error)
	RecordBatch(ctx context.Context, input models.BatchAttendanceInput) error
	GetDailyMetrics(ctx context.Context, date string) (*models.AttendanceSummary, error)
}

type PostgresAttendanceStore struct {
	pool *pgxpool.Pool
}

func NewAttendanceStore(pool *pgxpool.Pool) *PostgresAttendanceStore {
	return &PostgresAttendanceStore{pool: pool}
}

func (s *PostgresAttendanceStore) GetByClassAndDate(ctx context.Context, classID string, date string) ([]models.EnrichedAttendance, error) {
	query := `
		SELECT 
			a.id, a.student_id, a.class_id, a.date::text, a.status, a.notes, a.recorded_at,
			s.first_name, s.last_name, s.email, c.name
		FROM attendance a
		JOIN students s ON a.student_id = s.id
		JOIN classes c ON a.class_id = c.id
		WHERE a.class_id = $1 AND a.date = $2::date
		ORDER BY s.last_name ASC, s.first_name ASC
	`

	rows, err := s.pool.Query(ctx, query, classID, date)
	if err != nil {
		return nil, fmt.Errorf("failed to query attendance by class and date: %w", err)
	}
	defer rows.Close()

	var list []models.EnrichedAttendance
	for rows.Next() {
		var item models.EnrichedAttendance
		if err := rows.Scan(
			&item.ID,
			&item.StudentID,
			&item.ClassID,
			&item.Date,
			&item.Status,
			&item.Notes,
			&item.RecordedAt,
			&item.StudentFirstName,
			&item.StudentLastName,
			&item.StudentEmail,
			&item.ClassName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan attendance row: %w", err)
		}
		list = append(list, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return list, nil
}

func (s *PostgresAttendanceStore) GetByStudent(ctx context.Context, studentID string, startDate string, endDate string) ([]models.Attendance, error) {
	query := `
		SELECT id, student_id, class_id, date::text, status, notes, recorded_at
		FROM attendance
		WHERE student_id = $1
	`
	args := []any{studentID}
	argIdx := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND date >= $%d::date", argIdx)
		args = append(args, startDate)
		argIdx++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND date <= $%d::date", argIdx)
		args = append(args, endDate)
		argIdx++
	}

	query += " ORDER BY date DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query attendance by student: %w", err)
	}
	defer rows.Close()

	var list []models.Attendance
	for rows.Next() {
		var a models.Attendance
		if err := rows.Scan(
			&a.ID,
			&a.StudentID,
			&a.ClassID,
			&a.Date,
			&a.Status,
			&a.Notes,
			&a.RecordedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan student attendance row: %w", err)
		}
		list = append(list, a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return list, nil
}

func (s *PostgresAttendanceStore) RecordBatch(ctx context.Context, input models.BatchAttendanceInput) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	query := `
		INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_at)
		VALUES ($1, $2, $3::date, $4, $5, NOW())
		ON CONFLICT (student_id, class_id, date)
		DO UPDATE SET
			status = EXCLUDED.status,
			notes = EXCLUDED.notes,
			recorded_at = NOW()
	`

	for _, rec := range input.Records {
		_, err := tx.Exec(ctx, query, rec.StudentID, input.ClassID, input.Date, rec.Status, rec.Notes)
		if err != nil {
			return fmt.Errorf("failed to upsert attendance for student %s: %w", rec.StudentID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit batch attendance: %w", err)
	}

	return nil
}

func (s *PostgresAttendanceStore) GetDailyMetrics(ctx context.Context, date string) (*models.AttendanceSummary, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'present') as present_count,
			COUNT(*) FILTER (WHERE status = 'late') as late_count,
			COUNT(*) FILTER (WHERE status = 'excused') as excused_count,
			COUNT(*) FILTER (WHERE status = 'absent') as absent_count
		FROM attendance
		WHERE date = $1::date
	`

	var total, present, late, excused, absent int
	err := s.pool.QueryRow(ctx, query, date).Scan(&total, &present, &late, &excused, &absent)
	if err != nil {
		return nil, fmt.Errorf("failed to query daily attendance metrics: %w", err)
	}

	rate := 0.0
	if total > 0 {
		rate = math.Round((float64(present+late)/float64(total))*1000) / 10
	}

	return &models.AttendanceSummary{
		Date:           date,
		TotalRecorded:  total,
		Present:        present,
		Late:           late,
		Excused:        excused,
		Absent:         absent,
		AttendanceRate: rate,
	}, nil
}

