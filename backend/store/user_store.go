package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"sasake-backend/models"
	"sasake-backend/utils"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrConflictUsername   = errors.New("a user with this username already exists")
	ErrUserInactive       = errors.New("user account is deactivated")
)

type UserStore interface {
	Authenticate(ctx context.Context, username, password string) (*models.User, error)
	GetAll(ctx context.Context) ([]models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	Create(ctx context.Context, input models.CreateUserInput) (*models.User, error)
	Delete(ctx context.Context, id string) error
	SeedDefaultUsers(ctx context.Context) error
}

type PostgresUserStore struct {
	pool *pgxpool.Pool
}

func NewUserStore(pool *pgxpool.Pool) *PostgresUserStore {
	return &PostgresUserStore{pool: pool}
}

func (s *PostgresUserStore) Authenticate(ctx context.Context, username, password string) (*models.User, error) {
	trimmedUsername := strings.TrimSpace(strings.ToLower(username))

	query := `
		SELECT id, email, username, password_hash, full_name, role, is_active, created_at, updated_at
		FROM users
		WHERE LOWER(username) = $1 OR LOWER(email) = $1
	`

	var u models.User
	err := s.pool.QueryRow(ctx, query, trimmedUsername).Scan(
		&u.ID,
		&u.Email,
		&u.Username,
		&u.PasswordHash,
		&u.FullName,
		&u.Role,
		&u.IsActive,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("database query error: %w", err)
	}

	if !u.IsActive {
		return nil, ErrUserInactive
	}

	if !utils.CheckPassword(password, u.PasswordHash) {
		return nil, ErrInvalidCredentials
	}

	return &u, nil
}

func (s *PostgresUserStore) GetAll(ctx context.Context) ([]models.User, error) {
	query := `
		SELECT id, email, username, full_name, role, is_active, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID,
			&u.Email,
			&u.Username,
			&u.FullName,
			&u.Role,
			&u.IsActive,
			&u.CreatedAt,
			&u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, u)
	}

	if users == nil {
		users = []models.User{}
	}

	return users, nil
}

func (s *PostgresUserStore) GetByID(ctx context.Context, id string) (*models.User, error) {
	query := `
		SELECT id, email, username, full_name, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u models.User
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Email,
		&u.Username,
		&u.FullName,
		&u.Role,
		&u.IsActive,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to query user by id: %w", err)
	}

	return &u, nil
}

func (s *PostgresUserStore) Create(ctx context.Context, input models.CreateUserInput) (*models.User, error) {
	trimmedEmail := strings.TrimSpace(strings.ToLower(input.Email))
	trimmedUsername := strings.TrimSpace(strings.ToLower(input.Username))

	if input.Role != models.RoleAdmin && input.Role != models.RoleTeacher {
		input.Role = models.RoleTeacher
	}

	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	query := `
		INSERT INTO users (email, username, password_hash, full_name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
		RETURNING id, email, username, full_name, role, is_active, created_at, updated_at
	`

	var u models.User
	err = s.pool.QueryRow(ctx, query,
		trimmedEmail,
		trimmedUsername,
		hash,
		strings.TrimSpace(input.FullName),
		input.Role,
	).Scan(
		&u.ID,
		&u.Email,
		&u.Username,
		&u.FullName,
		&u.Role,
		&u.IsActive,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "users_email_key") || strings.Contains(errMsg, "unique constraint") && strings.Contains(errMsg, "email") {
			return nil, ErrConflictEmail
		}
		if strings.Contains(errMsg, "users_username_key") || strings.Contains(errMsg, "unique constraint") && strings.Contains(errMsg, "username") {
			return nil, ErrConflictUsername
		}
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	return &u, nil
}

func (s *PostgresUserStore) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`
	tag, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresUserStore) SeedDefaultUsers(ctx context.Context) error {
	seeds := []struct {
		email    string
		username string
		password string
		fullName string
		role     models.UserRole
	}{
		{
			email:    "admin@encina.com",
			username: "admin",
			password: "admin123",
			fullName: "Administrador Encina",
			role:     models.RoleAdmin,
		},
		{
			email:    "profesor@encina.com",
			username: "profesor",
			password: "profesor123",
			fullName: "Profesor Encina",
			role:     models.RoleTeacher,
		},
	}

	for _, seed := range seeds {
		var exists bool
		err := s.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2)", strings.ToLower(seed.email), strings.ToLower(seed.username)).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check user existence: %w", err)
		}
		if !exists {
			hash, err := utils.HashPassword(seed.password)
			if err != nil {
				return err
			}
			_, err = s.pool.Exec(ctx, `
				INSERT INTO users (email, username, password_hash, full_name, role, is_active, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
			`, strings.ToLower(seed.email), strings.ToLower(seed.username), hash, seed.fullName, seed.role)
			if err != nil {
				return fmt.Errorf("failed to seed user %s: %w", seed.username, err)
			}
		}
	}
	return nil
}
