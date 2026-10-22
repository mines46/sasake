package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"sasake-backend/utils"
)

// CheckAndSeedDevelopmentData checks if the environment is development (ENV=development or SEED_MOCK_DATA=true).
// If in development and the database is empty, it automatically populates the full mock dataset.
func CheckAndSeedDevelopmentData(ctx context.Context, pool *pgxpool.Pool) error {
	envMode := strings.ToLower(strings.TrimSpace(os.Getenv("ENV")))
	seedMock := strings.ToLower(strings.TrimSpace(os.Getenv("SEED_MOCK_DATA")))

	if seedMock == "false" || seedMock == "0" {
		log.Println("[INFO] SEED_MOCK_DATA=false explicitly set. Skipping mock data seeding.")
		return nil
	}

	isDev := envMode == "development" || envMode == "dev" || seedMock == "true" || seedMock == "1"
	if !isDev {
		log.Println("[INFO] Production environment detected. Running clean without mock data.")
		return nil
	}

	// Check if database already contains students
	var studentCount int
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM students").Scan(&studentCount)
	if err != nil {
		return fmt.Errorf("failed to check student count: %w", err)
	}

	if studentCount > 0 {
		log.Printf("[INFO] Development database already has %d students. Skipping mock auto-seed.", studentCount)
		return nil
	}

	log.Println("[INFO] Development environment with empty database detected. Seeding full mock dataset...")
	return SeedMockData(ctx, pool)
}

// SeedMockData populates the database with the complete development dataset
func SeedMockData(ctx context.Context, pool *pgxpool.Pool) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin seed transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Seed Users (admin & teacher)
	adminHash, err := utils.HashPassword("admin123")
	if err != nil {
		return err
	}
	teacherHash, err := utils.HashPassword("profesor123")
	if err != nil {
		return err
	}

	usersSQL := `
		INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
		VALUES 
		('00000000-0000-0000-0000-000000000001', 'admin@encina.com', 'admin', $1, 'Administrador Encina', 'admin', TRUE, NOW(), NOW()),
		('00000000-0000-0000-0000-000000000002', 'profesor@encina.com', 'profesor', $2, 'Profesor Encina', 'teacher', TRUE, NOW(), NOW())
		ON CONFLICT (username) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, usersSQL, adminHash, teacherHash); err != nil {
		return fmt.Errorf("failed to seed users: %w", err)
	}

	// 2. Seed Classes
	classesSQL := `
		INSERT INTO classes (id, name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, class_type, is_active, created_at)
		VALUES 
		('11111111-1111-1111-1111-111111111111', 'Matemáticas Avanzadas (Selectividad)', 'Preparación intensiva para EBAU / Selectividad. Cálculo, matrices y geometría.', 'Dr. Arthur Vance', 16, 2500, 20000, 'monthly', 'group', TRUE, NOW()),
		('22222222-2222-2222-2222-222222222222', 'Programación Python & Robótica 101', 'Programación aplicada, microcontroladores Arduino y algoritmos prácticos.', 'Sarah Jenkins', 12, 3000, 24000, 'monthly', 'group', TRUE, NOW()),
		('33333333-3333-3333-3333-333333333333', 'Inglés B2 First (Cambridge)', 'Gramática, vocabulario y speaking enfocado a certificaciones oficiales de Cambridge.', 'Takeshi Yamada', 14, 2000, 16000, 'monthly', 'group', TRUE, NOW()),
		('44444444-4444-4444-4444-444444444444', 'Arte Digital & Ilustración', 'Composición, teoría del color, modelado 2D y técnicas digitales modernas.', 'Maya Lin', 10, 2200, 17600, 'monthly', 'group', TRUE, NOW()),
		('55555555-5555-5555-5555-555555555555', 'Masterclass Individual de Piano', 'Clases particulares de técnica acústica y repertorio para pianistas.', 'Julian Cole', 1, 3500, 28000, 'monthly', 'individual', TRUE, NOW()),
		('66666666-6666-6666-6666-666666666666', 'Clase Particular de Física y Química', 'Refuerzo individualizado de cinemática, termodinámica y estequiometría.', 'Dr. Marcos Valdés', 1, 3000, 24000, 'monthly', 'individual', TRUE, NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, classesSQL); err != nil {
		return fmt.Errorf("failed to seed classes: %w", err)
	}

	// 3. Seed Schedules
	schedulesSQL := `
		INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room)
		VALUES 
		('11111111-1111-1111-1111-111111111111', 2, '09:00:00', '10:30:00', 'Aula 101'),
		('11111111-1111-1111-1111-111111111111', 5, '09:00:00', '10:30:00', 'Aula 101'),
		('22222222-2222-2222-2222-222222222222', 1, '11:00:00', '12:30:00', 'Lab Robótica'),
		('22222222-2222-2222-2222-222222222222', 3, '11:00:00', '12:30:00', 'Lab Robótica'),
		('33333333-3333-3333-3333-333333333333', 2, '16:00:00', '17:30:00', 'Aula 102'),
		('33333333-3333-3333-3333-333333333333', 4, '16:00:00', '17:30:00', 'Aula 102'),
		('44444444-4444-4444-4444-444444444444', 6, '10:00:00', '13:00:00', 'Aula Multimedia'),
		('55555555-5555-5555-5555-555555555555', 4, '17:30:00', '18:30:00', 'Sala Música 1'),
		('66666666-6666-6666-6666-666666666666', 3, '18:00:00', '19:00:00', 'Aula 103');
	`
	if _, err := tx.Exec(ctx, schedulesSQL); err != nil {
		return fmt.Errorf("failed to seed schedules: %w", err)
	}

	// 4. Seed 20 Students
	studentsSQL := `
		INSERT INTO students (id, first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, status, created_at, updated_at)
		VALUES 
		-- Menores (Requieren tutor)
		('f873752e-5612-4f36-9b51-3cfd81b37991', 'Elena', 'Rostova', 'elena.rostova@encina.com', '+34 611 234 567', TRUE, 'Mikhail Rostov', '+34 611 234 500', 'active', NOW(), NOW()),
		('a12e345b-6789-4def-0123-456789abcdef', 'Kenji', 'Sato', 'kenji.sato@encina.com', '+34 622 345 678', TRUE, 'Aoi Sato', '+34 622 345 600', 'active', NOW(), NOW()),
		('d45b678e-901c-4012-3456-789012def012', 'Lucía', 'Fernández', 'lucia.fernandez@encina.com', '+34 655 678 901', TRUE, 'Carlos Fernández', '+34 655 678 900', 'active', NOW(), NOW()),
		('f67d8901-123e-4234-5678-901234f01234', 'Sofía', 'Navarro', 'sofia.navarro@encina.com', '+34 677 890 123', TRUE, 'Andrés Navarro', '+34 677 890 100', 'active', NOW(), NOW()),
		('52334567-7894-4890-1234-567890567890', 'Daniel', 'Romero', 'daniel.romero@encina.com', '+34 643 456 789', TRUE, 'Javier Romero', '+34 643 456 700', 'active', NOW(), NOW()),

		-- Mayores de edad (+18 años, contacto directo, sin tutor)
		('b23f456c-789a-4ef0-1234-567890bcdef0', 'Amara', 'Okafor', 'amara.okafor@encina.com', '+34 633 456 789', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('c34a567d-890b-4f01-2345-678901cdef01', 'Mateo', 'García', 'mateo.garcia@encina.com', '+34 644 567 890', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('e56c789f-012d-4123-4567-890123ef0123', 'Carlos', 'Morales', 'carlos.morales@encina.com', '+34 666 789 012', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('078e9012-234f-4345-6789-012345012345', 'Alejandro', 'Gómez', 'alejandro.gomez@encina.com', '+34 688 901 234', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('189f0123-3450-4456-7890-123456123456', 'Carmen', 'Ruiz', 'carmen.ruiz@encina.com', '+34 699 012 345', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('29001234-4561-4567-8901-234567234567', 'David', 'Torres', 'david.torres@encina.com', '+34 610 123 456', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('30112345-5672-4678-9012-345678345678', 'Javier', 'Martín', 'javier.martin@encina.com', '+34 621 234 567', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('41223456-6783-4789-0123-456789456789', 'Paula', 'Sánchez', 'paula.sanchez@encina.com', '+34 632 345 678', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('63445678-8905-4901-2345-678901678901', 'Alba', 'Vega', 'alba.vega@encina.com', '+34 654 567 890', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('74556789-9016-4012-3456-789012789012', 'Hugo', 'Navarro', 'hugo.navarro@encina.com', '+34 665 678 901', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('85667890-0127-4123-4567-890123890123', 'Irene', 'Delgado', 'irene.delgado@encina.com', '+34 676 789 012', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('96778901-1238-4234-5678-901234901234', 'Gonzalo', 'Castillo', 'gonzalo.castillo@encina.com', '+34 687 890 123', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('a7889012-2349-4345-6789-012345012346', 'Marina', 'Ortiz', 'marina.ortiz@encina.com', '+34 698 901 234', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('b8990123-345a-4456-7890-123456123457', 'Pablo', 'Serrano', 'pablo.serrano@encina.com', '+34 619 012 345', FALSE, NULL, NULL, 'active', NOW(), NOW()),
		('c9aa1234-456b-4567-8901-234567234568', 'Claudia', 'Reyes', 'claudia.reyes@encina.com', '+34 620 123 456', FALSE, NULL, NULL, 'active', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, studentsSQL); err != nil {
		return fmt.Errorf("failed to seed students: %w", err)
	}

	// 5. Seed Enrollments
	enrollmentsSQL := `
		INSERT INTO enrollments (student_id, class_id, enrolled_at, status)
		VALUES 
		('f873752e-5612-4f36-9b51-3cfd81b37991', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', NOW(), 'active'),
		('a12e345b-6789-4def-0123-456789abcdef', '22222222-2222-2222-2222-222222222222', NOW(), 'active'),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', NOW(), 'active'),
		('c34a567d-890b-4f01-2345-678901cdef01', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', NOW(), 'active'),
		('e56c789f-012d-4123-4567-890123ef0123', '44444444-4444-4444-4444-444444444444', NOW(), 'active'),
		('f67d8901-123e-4234-5678-901234f01234', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('078e9012-234f-4345-6789-012345012345', '22222222-2222-2222-2222-222222222222', NOW(), 'active'),
		('189f0123-3450-4456-7890-123456123456', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		('29001234-4561-4567-8901-234567234567', '44444444-4444-4444-4444-444444444444', NOW(), 'active'),
		('30112345-5672-4678-9012-345678345678', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('41223456-6783-4789-0123-456789456789', '22222222-2222-2222-2222-222222222222', NOW(), 'active'),
		('52334567-7894-4890-1234-567890567890', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		('63445678-8905-4901-2345-678901678901', '44444444-4444-4444-4444-444444444444', NOW(), 'active'),
		('74556789-9016-4012-3456-789012789012', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('85667890-0127-4123-4567-890123890123', '55555555-5555-5555-5555-555555555555', NOW(), 'active'),
		('96778901-1238-4234-5678-901234901234', '66666666-6666-6666-6666-666666666666', NOW(), 'active'),
		('a7889012-2349-4345-6789-012345012346', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		('b8990123-345a-4456-7890-123456123457', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('c9aa1234-456b-4567-8901-234567234568', '22222222-2222-2222-2222-222222222222', NOW(), 'active')
		ON CONFLICT (student_id, class_id) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, enrollmentsSQL); err != nil {
		return fmt.Errorf("failed to seed enrollments: %w", err)
	}

	// 6. Seed Attendance Records
	attendanceSQL := `
		INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_at)
		VALUES 
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-01', 'present', 'Sesión completada', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-08', 'present', 'Sesión completada', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-15', 'late', 'Retraso de 10 min, clase recuperada', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-22', 'absent', 'Inasistencia sin avisar - Facturable', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-29', 'excused', 'Cita médica justificada con volante - Exenta', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-07', 'present', 'Sesión completada', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-14', 'present', 'Sesión completada', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-21', 'present', 'Sesión completada', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-28', 'present', 'Sesión completada', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-01', 'present', 'Sesión completada', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-08', 'present', 'Sesión completada', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-15', 'absent', 'Sin justificar - Facturable', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-22', 'present', 'Sesión completada', NOW())
		ON CONFLICT (student_id, class_id, date) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, attendanceSQL); err != nil {
		return fmt.Errorf("failed to seed attendance: %w", err)
	}

	// 7. Seed Invoices
	invoicesSQL := `
		INSERT INTO invoices (id, invoice_number, student_id, issue_date, due_date, subtotal_cents, discount_cents, total_cents, status, paid_at, notes, created_at)
		VALUES 
		('00000000-0000-0000-0004-000000000001', '2026-0001', 'f873752e-5612-4f36-9b51-3cfd81b37991', '2026-10-01', '2026-10-10', 34000, 0, 34000, 'paid', '2026-10-03T10:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000002', '2026-0002', 'a12e345b-6789-4def-0123-456789abcdef', '2026-10-01', '2026-10-10', 24000, 0, 24000, 'paid', '2026-10-04T12:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000003', '2026-0003', 'b23f456c-789a-4ef0-1234-567890bcdef0', '2026-10-01', '2026-10-10', 28000, 0, 28000, 'pending', NULL, 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000004', '2026-0004', 'c34a567d-890b-4f01-2345-678901cdef01', '2026-10-01', '2026-10-10', 20000, 0, 20000, 'paid', '2026-10-02T09:30:00Z', 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000005', '2026-0005', 'd45b678e-901c-4012-3456-789012def012', '2026-10-01', '2026-10-10', 14000, 0, 14000, 'paid', '2026-10-05T16:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000006', '2026-0006', 'e56c789f-012d-4123-4567-890123ef0123', '2026-10-01', '2026-10-10', 8800, 0, 8800, 'pending', NULL, 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000007', '2026-0007', 'f67d8901-123e-4234-5678-901234f01234', '2026-10-01', '2026-10-10', 20000, 0, 20000, 'paid', '2026-10-04T11:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000008', '2026-0008', '078e9012-234f-4345-6789-012345012345', '2026-10-01', '2026-10-10', 24000, 0, 24000, 'pending', NULL, 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000009', '2026-0009', '189f0123-3450-4456-7890-123456123456', '2026-10-01', '2026-10-10', 16000, 0, 16000, 'paid', '2026-10-06T18:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		('00000000-0000-0000-0004-000000000010', '2026-0010', '29001234-4561-4567-8901-234567234567', '2026-10-01', '2026-10-10', 8800, 0, 8800, 'paid', '2026-10-05T14:00:00Z', 'Mensualidad Octubre 2026', NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, invoicesSQL); err != nil {
		return fmt.Errorf("failed to seed invoices: %w", err)
	}

	// 8. Seed Line Items
	invoiceItemsSQL := `
		INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, total_cents)
		VALUES 
		('00000000-0000-0000-0004-000000000001', 'Matemáticas Avanzadas (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2500, 20000),
		('00000000-0000-0000-0004-000000000001', 'Masterclass Individual de Piano (Individual) — 4 sesiones (3 asistidas, 1 no justificada facturada)', 4, 3500, 14000),
		('00000000-0000-0000-0004-000000000002', 'Programación Python & Robótica 101 (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 3000, 24000),
		('00000000-0000-0000-0004-000000000003', 'Inglés B2 First (Cambridge) (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2000, 16000),
		('00000000-0000-0000-0004-000000000003', 'Clase Particular de Física y Química (Individual) — 4 sesiones (4 asistidas)', 4, 3000, 12000),
		('00000000-0000-0000-0004-000000000004', 'Matemáticas Avanzadas (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2500, 20000),
		('00000000-0000-0000-0004-000000000005', 'Masterclass Individual de Piano (Individual) — 4 sesiones (3 asistidas, 1 no justificada facturada)', 4, 3500, 14000),
		('00000000-0000-0000-0004-000000000006', 'Arte Digital & Ilustración (Grupal) — Cuota mensual adelantada (4 sesiones)', 4, 2200, 8800),
		('00000000-0000-0000-0004-000000000007', 'Matemáticas Avanzadas (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2500, 20000),
		('00000000-0000-0000-0004-000000000008', 'Programación Python & Robótica 101 (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 3000, 24000),
		('00000000-0000-0000-0004-000000000009', 'Inglés B2 First (Cambridge) (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2000, 16000),
		('00000000-0000-0000-0004-000000000010', 'Arte Digital & Ilustración (Grupal) — Cuota mensual adelantada (4 sesiones)', 4, 2200, 8800);
	`
	if _, err := tx.Exec(ctx, invoiceItemsSQL); err != nil {
		return fmt.Errorf("failed to seed invoice items: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}

	log.Println("[SUCCESS] Development mock dataset populated successfully (classes, schedules, 20 students, enrollments, attendance, invoices, users).")
	return nil
}

