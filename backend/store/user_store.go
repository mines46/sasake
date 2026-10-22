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
	Update(ctx context.Context, id string, input models.UpdateUserInput) (*models.User, error)
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

func (s *PostgresUserStore) Update(ctx context.Context, id string, input models.UpdateUserInput) (*models.User, error) {
	// 1. Fetch current user
	currentUser, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	email := currentUser.Email
	if input.Email != nil && strings.TrimSpace(*input.Email) != "" {
		email = strings.TrimSpace(strings.ToLower(*input.Email))
	}

	username := currentUser.Username
	if input.Username != nil && strings.TrimSpace(*input.Username) != "" {
		username = strings.TrimSpace(strings.ToLower(*input.Username))
	}

	fullName := currentUser.FullName
	if input.FullName != nil {
		fullName = strings.TrimSpace(*input.FullName)
	}

	role := currentUser.Role
	if input.Role != nil && (*input.Role == models.RoleAdmin || *input.Role == models.RoleTeacher) {
		role = *input.Role
	}

	isActive := currentUser.IsActive
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	var passwordHash string
	if input.Password != nil && strings.TrimSpace(*input.Password) != "" {
		hash, err := utils.HashPassword(*input.Password)
		if err != nil {
			return nil, fmt.Errorf("failed to hash new password: %w", err)
		}
		passwordHash = hash
	}

	var query string
	var queryArgs []interface{}

	if passwordHash != "" {
		query = `
			UPDATE users
			SET email = $1, username = $2, password_hash = $3, full_name = $4, role = $5, is_active = $6, updated_at = NOW()
			WHERE id = $7
			RETURNING id, email, username, full_name, role, is_active, created_at, updated_at
		`
		queryArgs = []interface{}{email, username, passwordHash, fullName, role, isActive, id}
	} else {
		query = `
			UPDATE users
			SET email = $1, username = $2, full_name = $3, role = $4, is_active = $5, updated_at = NOW()
			WHERE id = $6
			RETURNING id, email, username, full_name, role, is_active, created_at, updated_at
		`
		queryArgs = []interface{}{email, username, fullName, role, isActive, id}
	}

	var updated models.User
	err = s.pool.QueryRow(ctx, query, queryArgs...).Scan(
		&updated.ID,
		&updated.Email,
		&updated.Username,
		&updated.FullName,
		&updated.Role,
		&updated.IsActive,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "users_email_key") || (strings.Contains(errMsg, "unique constraint") && strings.Contains(errMsg, "email")) {
			return nil, ErrConflictEmail
		}
		if strings.Contains(errMsg, "users_username_key") || (strings.Contains(errMsg, "unique constraint") && strings.Contains(errMsg, "username")) {
			return nil, ErrConflictUsername
		}
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return &updated, nil
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
	// Seed only the initial administrator if no admin exists yet
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
