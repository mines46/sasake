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

var (
	ErrNotFound      = errors.New("resource not found")
	ErrConflictEmail = errors.New("a student with this email already exists")
)

type StudentStore interface {
	GetAll(ctx context.Context, status string, search string) ([]models.Student, error)
	GetByID(ctx context.Context, id string) (*models.Student, error)
	Create(ctx context.Context, input models.CreateStudentInput) (*models.Student, error)
	Update(ctx context.Context, id string, input models.UpdateStudentInput) (*models.Student, error)
	Delete(ctx context.Context, id string) error
}

type PostgresStudentStore struct {
	pool *pgxpool.Pool
}

func NewStudentStore(pool *pgxpool.Pool) *PostgresStudentStore {
	return &PostgresStudentStore{pool: pool}
}

func (s *PostgresStudentStore) GetAll(ctx context.Context, status string, search string) ([]models.Student, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, course_year, school_name, status, created_at, updated_at
		FROM students
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query += fmt.Sprintf(" AND (LOWER(first_name) LIKE $%d OR LOWER(last_name) LIKE $%d OR LOWER(email) LIKE $%d OR LOWER(COALESCE(guardian_name, '')) LIKE $%d OR LOWER(COALESCE(course_year, '')) LIKE $%d OR LOWER(COALESCE(school_name, '')) LIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	query += " ORDER BY created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query students: %w", err)
	}
	defer rows.Close()

	var students []models.Student
	for rows.Next() {
		var st models.Student
		if err := rows.Scan(
			&st.ID,
			&st.FirstName,
			&st.LastName,
			&st.Email,
			&st.Phone,
			&st.IsMinor,
			&st.GuardianName,
			&st.GuardianPhone,
			&st.CourseYear,
			&st.SchoolName,
			&st.Status,
			&st.CreatedAt,
			&st.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan student row: %w", err)
		}
		students = append(students, st)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return students, nil
}

func (s *PostgresStudentStore) GetByID(ctx context.Context, id string) (*models.Student, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, course_year, school_name, status, created_at, updated_at
		FROM students
		WHERE id = $1
	`
	var st models.Student
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&st.ID,
		&st.FirstName,
		&st.LastName,
		&st.Email,
		&st.Phone,
		&st.IsMinor,
		&st.GuardianName,
		&st.GuardianPhone,
		&st.CourseYear,
		&st.SchoolName,
		&st.Status,
		&st.CreatedAt,
		&st.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to fetch student by id: %w", err)
	}

	return &st, nil
}

func (s *PostgresStudentStore) Create(ctx context.Context, input models.CreateStudentInput) (*models.Student, error) {
	status := input.Status
	if status == "" {
		status = models.StudentStatusActive
	}

	isMinor := false
	if input.IsMinor != nil {
		isMinor = *input.IsMinor
	} else if input.GuardianName != nil && strings.TrimSpace(*input.GuardianName) != "" {
		isMinor = true
	}

	query := `
		INSERT INTO students (first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, course_year, school_name, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, course_year, school_name, status, created_at, updated_at
	`

	var st models.Student
	err := s.pool.QueryRow(
		ctx,
		query,
		input.FirstName,
		input.LastName,
		input.Email,
		input.Phone,
		isMinor,
		input.GuardianName,
		input.GuardianPhone,
		input.CourseYear,
		input.SchoolName,
		status,
	).Scan(
		&st.ID,
		&st.FirstName,
		&st.LastName,
		&st.Email,
		&st.Phone,
		&st.IsMinor,
		&st.GuardianName,
		&st.GuardianPhone,
		&st.CourseYear,
		&st.SchoolName,
		&st.Status,
		&st.CreatedAt,
		&st.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "students_email_key") {
			return nil, ErrConflictEmail
		}
		return nil, fmt.Errorf("failed to insert student: %w", err)
	}

	return &st, nil
}

func (s *PostgresStudentStore) Update(ctx context.Context, id string, input models.UpdateStudentInput) (*models.Student, error) {
	current, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	firstName := current.FirstName
	if input.FirstName != nil {
		firstName = *input.FirstName
	}
	lastName := current.LastName
	if input.LastName != nil {
		lastName = *input.LastName
	}
	email := current.Email
	if input.Email != nil {
		email = *input.Email
	}
	phone := current.Phone
	if input.Phone != nil {
		phone = input.Phone
	}
	isMinor := current.IsMinor
	if input.IsMinor != nil {
		isMinor = *input.IsMinor
	}
	guardianName := current.GuardianName
	if input.GuardianName != nil {
		guardianName = input.GuardianName
	}
	guardianPhone := current.GuardianPhone
	if input.GuardianPhone != nil {
		guardianPhone = input.GuardianPhone
	}
	courseYear := current.CourseYear
	if input.CourseYear != nil {
		courseYear = input.CourseYear
	}
	schoolName := current.SchoolName
	if input.SchoolName != nil {
		schoolName = input.SchoolName
	}
	status := current.Status
	if input.Status != nil {
		status = *input.Status
	}

	query := `
		UPDATE students
		SET first_name = $1, last_name = $2, email = $3, phone = $4, is_minor = $5, guardian_name = $6, guardian_phone = $7, course_year = $8, school_name = $9, status = $10, updated_at = $11
		WHERE id = $12
		RETURNING id, first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, course_year, school_name, status, created_at, updated_at
	`

	var updated models.Student
	err = s.pool.QueryRow(
		ctx,
		query,
		firstName,
		lastName,
		email,
		phone,
		isMinor,
		guardianName,
		guardianPhone,
		courseYear,
		schoolName,
		status,
		time.Now(),
		id,
	).Scan(
		&updated.ID,
		&updated.FirstName,
		&updated.LastName,
		&updated.Email,
		&updated.Phone,
		&updated.IsMinor,
		&updated.GuardianName,
		&updated.GuardianPhone,
		&updated.CourseYear,
		&updated.SchoolName,
		&updated.Status,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "students_email_key") {
			return nil, ErrConflictEmail
		}
		return nil, fmt.Errorf("failed to update student: %w", err)
	}

	return &updated, nil
}

func (s *PostgresStudentStore) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM students WHERE id = $1`
	cmdTag, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete student: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
