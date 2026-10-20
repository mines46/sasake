package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	"sasake-backend/database"
	"sasake-backend/utils"
)

func main() {
	fmt.Println("==================================================")
	fmt.Println("       SasaKe Database Reset & Fresh Seed Engine   ")
	fmt.Println("==================================================")

	// 1. Try finding and loading .env
	envPaths := []string{".env", "../.env", "../../.env"}
	for _, p := range envPaths {
		if err := godotenv.Load(p); err == nil {
			fmt.Printf(" Loaded environment from: %s\n", p)
			break
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	pool, err := database.ConnectPool(ctx)
	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}
	defer pool.Close()
	fmt.Println(" Live connection to PostgreSQL established.")

	// 2. Ensure schema definitions are updated
	schemaPaths := []string{
		"database/schema.sql",
		"../database/schema.sql",
		"../../database/schema.sql",
	}
	var schemaContent []byte
	for _, sp := range schemaPaths {
		abs, _ := filepath.Abs(sp)
		data, err := os.ReadFile(abs)
		if err == nil {
			schemaContent = data
			break
		}
	}
	if schemaContent != nil {
		if _, err := pool.Exec(ctx, string(schemaContent)); err != nil {
			log.Fatalf("❌ Failed to verify schema: %v", err)
		}
		fmt.Println(" Schema structures and constraints verified.")
	}

	// 3. Clear existing old data
	fmt.Println(" Purging old data (TRUNCATE CASCADE)...")
	truncateQuery := `
		TRUNCATE TABLE 
			invoice_items, 
			invoices, 
			attendance, 
			class_schedules, 
			enrollments, 
			classes, 
			students, 
			users 
		CASCADE;
	`
	if _, err := pool.Exec(ctx, truncateQuery); err != nil {
		log.Fatalf("❌ Failed to truncate old data: %v", err)
	}
	fmt.Println(" All previous records cleared successfully.")

	// 4. Begin Seed Transaction
	tx, err := pool.Begin(ctx)
	if err != nil {
		log.Fatalf("❌ Failed to begin transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	// 4.1 Seed Users
	fmt.Println(" Seeding system users (admin & teacher)...")
	adminHash, _ := utils.HashPassword("admin123")
	teacherHash, _ := utils.HashPassword("profesor123")

	usersSQL := `
		INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
		VALUES 
		('00000000-0000-0000-0000-000000000001', 'admin@encina.com', 'admin', $1, 'Administrador Encina', 'admin', TRUE, NOW(), NOW()),
		('00000000-0000-0000-0000-000000000002', 'profesor@encina.com', 'profesor', $2, 'Profesor Encina', 'teacher', TRUE, NOW(), NOW())
		ON CONFLICT (email) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, usersSQL, adminHash, teacherHash); err != nil {
		log.Fatalf("❌ Error inserting users: %v", err)
	}

	// 4.2 Seed Classes (Group vs Individual)
	fmt.Println(" Seeding classes with Group (advance) and Individual (attendance) modalities...")
	classesSQL := `
		INSERT INTO classes (id, name, description, instructor_name, capacity, cost_per_session_cents, price_cents, billing_period, class_type, is_active, created_at)
		VALUES 
		('11111111-1111-1111-1111-111111111111', 'Matemáticas Avanzadas (Selectividad)', 'Preparación intensiva para EBAU / Selectividad. Cálculo, matrices y geometría.', 'Dr. Arthur Vance', 16, 2500, 20000, 'monthly', 'group', TRUE, NOW()),
		('22222222-2222-2222-2222-222222222222', 'Programación Python & Robótica 101', 'Programación aplicada, microcontroladores Arduino y algoritmos prácticos.', 'Sarah Jenkins', 12, 3000, 24000, 'monthly', 'group', TRUE, NOW()),
		('33333333-3333-3333-3333-333333333333', 'Inglés B2 First (Cambridge)', 'Gramática, vocabulario y speaking enfocado a certificaciones oficiales de Cambridge.', 'Takeshi Yamada', 14, 2000, 16000, 'monthly', 'group', TRUE, NOW()),
		('44444444-4444-4444-4444-444444444444', 'Arte Digital & Ilustración', 'Composición, teoría del color, modelado 2D y técnicas digitales modernas.', 'Maya Lin', 10, 2200, 17600, 'monthly', 'group', TRUE, NOW()),
		('55555555-5555-5555-5555-555555555555', 'Masterclass Individual de Piano', 'Clases particulares de técnica acústica y repertorio para pianistas.', 'Julian Cole', 1, 3500, 28000, 'monthly', 'individual', TRUE, NOW()),
		('66666666-6666-6666-6666-666666666666', 'Clase Particular de Física y Química', 'Refuerzo individualizado de cinemática, termodinámica y estequiometría.', 'Dr. Marcos Valdés', 1, 3000, 24000, 'monthly', 'individual', TRUE, NOW());
	`
	if _, err := tx.Exec(ctx, classesSQL); err != nil {
		log.Fatalf("❌ Error inserting classes: %v", err)
	}

	// 4.3 Seed Class Schedules
	fmt.Println(" Seeding recurring class schedules...")
	schedulesSQL := `
		INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room)
		VALUES 
		-- C1: Martes (2) y Viernes (5) 09:00-10:30
		('11111111-1111-1111-1111-111111111111', 2, '09:00:00', '10:30:00', 'Aula 101'),
		('11111111-1111-1111-1111-111111111111', 5, '09:00:00', '10:30:00', 'Aula 101'),
		-- C2: Lunes (1) y Miércoles (3) 11:00-12:30
		('22222222-2222-2222-2222-222222222222', 1, '11:00:00', '12:30:00', 'Lab Robótica'),
		('22222222-2222-2222-2222-222222222222', 3, '11:00:00', '12:30:00', 'Lab Robótica'),
		-- C3: Martes (2) y Jueves (4) 16:00-17:30
		('33333333-3333-3333-3333-333333333333', 2, '16:00:00', '17:30:00', 'Aula 102'),
		('33333333-3333-3333-3333-333333333333', 4, '16:00:00', '17:30:00', 'Aula 102'),
		-- C4: Sábado (6) 10:00-13:00
		('44444444-4444-4444-4444-444444444444', 6, '10:00:00', '13:00:00', 'Aula Multimedia'),
		-- C5: Jueves (4) 17:30-18:30 (Individual)
		('55555555-5555-5555-5555-555555555555', 4, '17:30:00', '18:30:00', 'Sala Música 1'),
		-- C6: Miércoles (3) 18:00-19:00 (Individual)
		('66666666-6666-6666-6666-666666666666', 3, '18:00:00', '19:00:00', 'Aula 103');
	`
	if _, err := tx.Exec(ctx, schedulesSQL); err != nil {
		log.Fatalf("❌ Error inserting schedules: %v", err)
	}

	// 4.4 Seed 20 Students (Demonstrating adults >18 without tutor and minors with tutor)
	fmt.Println(" Seeding 20 students (adults without tutor & minors with legal tutor)...")
	studentsSQL := `
		INSERT INTO students (id, first_name, last_name, email, phone, is_minor, guardian_name, guardian_phone, status, created_at, updated_at)
		VALUES 
		-- Menores (Requieren tutor legal)
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
		('c9aa1234-456b-4567-8901-234567234568', 'Claudia', 'Reyes', 'claudia.reyes@encina.com', '+34 620 123 456', FALSE, NULL, NULL, 'active', NOW(), NOW());
	`
	if _, err := tx.Exec(ctx, studentsSQL); err != nil {
		log.Fatalf("❌ Error inserting students: %v", err)
	}

	// 4.5 Seed Enrollments
	fmt.Println(" Seeding student enrollments...")
	enrollmentsSQL := `
		INSERT INTO enrollments (student_id, class_id, enrolled_at, status)
		VALUES 
		-- Elena Rostova: Matemáticas (Grupal) y Piano (Individual)
		('f873752e-5612-4f36-9b51-3cfd81b37991', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', NOW(), 'active'),
		-- Kenji Sato: Python & Robótica (Grupal)
		('a12e345b-6789-4def-0123-456789abcdef', '22222222-2222-2222-2222-222222222222', NOW(), 'active'),
		-- Amara Okafor: Inglés B2 (Grupal) y Física (Individual)
		('b23f456c-789a-4ef0-1234-567890bcdef0', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', NOW(), 'active'),
		-- Mateo García: Matemáticas (Grupal)
		('c34a567d-890b-4f01-2345-678901cdef01', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		-- Lucía Fernández: Piano (Individual)
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', NOW(), 'active'),
		-- Carlos Morales: Arte Digital (Grupal)
		('e56c789f-012d-4123-4567-890123ef0123', '44444444-4444-4444-4444-444444444444', NOW(), 'active'),
		-- Sofía Navarro: Matemáticas (Grupal)
		('f67d8901-123e-4234-5678-901234f01234', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		-- Alejandro Gómez: Python & Robótica (Grupal)
		('078e9012-234f-4345-6789-012345012345', '22222222-2222-2222-2222-222222222222', NOW(), 'active'),
		-- Carmen Ruiz: Inglés B2 (Grupal)
		('189f0123-3450-4456-7890-123456123456', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		-- David Torres: Arte Digital (Grupal)
		('29001234-4561-4567-8901-234567234567', '44444444-4444-4444-4444-444444444444', NOW(), 'active'),
		-- Javier Martín: Matemáticas (Grupal)
		('30112345-5672-4678-9012-345678345678', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		-- Paula Sánchez: Python & Robótica (Grupal)
		('41223456-6783-4789-0123-456789456789', '22222222-2222-2222-2222-222222222222', NOW(), 'active'),
		-- Daniel Romero: Inglés B2 (Grupal)
		('52334567-7894-4890-1234-567890567890', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		-- Alba Vega: Arte Digital (Grupal)
		('63445678-8905-4901-2345-678901678901', '44444444-4444-4444-4444-444444444444', NOW(), 'active'),
		-- Hugo Navarro: Matemáticas (Grupal)
		('74556789-9016-4012-3456-789012789012', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		-- Irene Delgado: Piano (Individual)
		('85667890-0127-4123-4567-890123890123', '55555555-5555-5555-5555-555555555555', NOW(), 'active'),
		-- Gonzalo Castillo: Física (Individual)
		('96778901-1238-4234-5678-901234901234', '66666666-6666-6666-6666-666666666666', NOW(), 'active'),
		-- Marina Ortiz: Inglés B2 (Grupal)
		('a7889012-2349-4345-6789-012345012346', '33333333-3333-3333-3333-333333333333', NOW(), 'active'),
		-- Pablo Serrano: Matemáticas (Grupal)
		('b8990123-345a-4456-7890-123456123457', '11111111-1111-1111-1111-111111111111', NOW(), 'active'),
		-- Claudia Reyes: Python & Robótica (Grupal)
		('c9aa1234-456b-4567-8901-234567234568', '22222222-2222-2222-2222-222222222222', NOW(), 'active');
	`
	if _, err := tx.Exec(ctx, enrollmentsSQL); err != nil {
		log.Fatalf("❌ Error inserting enrollments: %v", err)
	}

	// 4.6 Seed Attendance Records for Individual Classes
	fmt.Println(" Seeding attendance records (demonstrating unexcused vs excused rule)...")
	attendanceSQL := `
		INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_at)
		VALUES 
		-- Elena Rostova en Piano (Individual, c5): 3 present, 1 unexcused absent (billed!), 1 excused (waived!)
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-01', 'present', 'Sesión completada', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-08', 'present', 'Sesión completada', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-15', 'late', 'Retraso de 10 min, clase recuperada', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-22', 'absent', 'Inasistencia sin avisar - Facturable', NOW()),
		('f873752e-5612-4f36-9b51-3cfd81b37991', '55555555-5555-5555-5555-555555555555', '2026-10-29', 'excused', 'Cita médica justificada con volante - Exenta', NOW()),

		-- Amara Okafor en Física (Individual, c6): 4 present
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-07', 'present', 'Sesión completada', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-14', 'present', 'Sesión completada', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-21', 'present', 'Sesión completada', NOW()),
		('b23f456c-789a-4ef0-1234-567890bcdef0', '66666666-6666-6666-6666-666666666666', '2026-10-28', 'present', 'Sesión completada', NOW()),

		-- Lucía Fernández en Piano (Individual, c5): 3 present, 1 unexcused
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-01', 'present', 'Sesión completada', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-08', 'present', 'Sesión completada', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-15', 'absent', 'Sin justificar - Facturable', NOW()),
		('d45b678e-901c-4012-3456-789012def012', '55555555-5555-5555-5555-555555555555', '2026-10-22', 'present', 'Sesión completada', NOW());
	`
	if _, err := tx.Exec(ctx, attendanceSQL); err != nil {
		log.Fatalf("❌ Error inserting attendance: %v", err)
	}

	// 4.7 Seed Invoices (10 Official Recibos matching the 10-per-A4 grid)
	fmt.Println(" Seeding initial invoices (recibos) demonstrating Group advance and Individual attendance...")
	invoicesSQL := `
		INSERT INTO invoices (id, invoice_number, student_id, issue_date, due_date, subtotal_cents, discount_cents, total_cents, status, paid_at, notes, created_at)
		VALUES 
		-- 1. Elena Rostova: Matemáticas (Grupal 8x25=200) + Piano (Individual 4x35=140) = 340.00 €
		('00000000-0000-0000-0004-000000000001', '2026-0001', 'f873752e-5612-4f36-9b51-3cfd81b37991', '2026-10-01', '2026-10-10', 34000, 0, 34000, 'paid', '2026-10-03T10:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		-- 2. Kenji Sato: Python & Robótica (Grupal 8x30=240) = 240.00 €
		('00000000-0000-0000-0004-000000000002', '2026-0002', 'a12e345b-6789-4def-0123-456789abcdef', '2026-10-01', '2026-10-10', 24000, 0, 24000, 'paid', '2026-10-04T12:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		-- 3. Amara Okafor: Inglés B2 (Grupal 8x20=160) + Física (Individual 4x30=120) = 280.00 €
		('00000000-0000-0000-0004-000000000003', '2026-0003', 'b23f456c-789a-4ef0-1234-567890bcdef0', '2026-10-01', '2026-10-10', 28000, 0, 28000, 'pending', NULL, 'Mensualidad Octubre 2026', NOW()),
		-- 4. Mateo García: Matemáticas (Grupal 8x25=200) = 200.00 €
		('00000000-0000-0000-0004-000000000004', '2026-0004', 'c34a567d-890b-4f01-2345-678901cdef01', '2026-10-01', '2026-10-10', 20000, 0, 20000, 'paid', '2026-10-02T09:30:00Z', 'Mensualidad Octubre 2026', NOW()),
		-- 5. Lucía Fernández: Piano (Individual 4x35=140) = 140.00 €
		('00000000-0000-0000-0004-000000000005', '2026-0005', 'd45b678e-901c-4012-3456-789012def012', '2026-10-01', '2026-10-10', 14000, 0, 14000, 'paid', '2026-10-05T16:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		-- 6. Carlos Morales: Arte Digital (Grupal 4x22=88) = 88.00 €
		('00000000-0000-0000-0004-000000000006', '2026-0006', 'e56c789f-012d-4123-4567-890123ef0123', '2026-10-01', '2026-10-10', 8800, 0, 8800, 'pending', NULL, 'Mensualidad Octubre 2026', NOW()),
		-- 7. Sofía Navarro: Matemáticas (Grupal 8x25=200) = 200.00 €
		('00000000-0000-0000-0004-000000000007', '2026-0007', 'f67d8901-123e-4234-5678-901234f01234', '2026-10-01', '2026-10-10', 20000, 0, 20000, 'paid', '2026-10-04T11:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		-- 8. Alejandro Gómez: Python (Grupal 8x30=240) = 240.00 €
		('00000000-0000-0000-0004-000000000008', '2026-0008', '078e9012-234f-4345-6789-012345012345', '2026-10-01', '2026-10-10', 24000, 0, 24000, 'pending', NULL, 'Mensualidad Octubre 2026', NOW()),
		-- 9. Carmen Ruiz: Inglés B2 (Grupal 8x20=160) = 160.00 €
		('00000000-0000-0000-0004-000000000009', '2026-0009', '189f0123-3450-4456-7890-123456123456', '2026-10-01', '2026-10-10', 16000, 0, 16000, 'paid', '2026-10-06T18:00:00Z', 'Mensualidad Octubre 2026', NOW()),
		-- 10. David Torres: Arte Digital (Grupal 4x22=88) = 88.00 €
		('00000000-0000-0000-0004-000000000010', '2026-0010', '29001234-4561-4567-8901-234567234567', '2026-10-01', '2026-10-10', 8800, 0, 8800, 'paid', '2026-10-05T14:00:00Z', 'Mensualidad Octubre 2026', NOW());
	`
	if _, err := tx.Exec(ctx, invoicesSQL); err != nil {
		log.Fatalf("❌ Error inserting invoices: %v", err)
	}

	// 4.8 Seed Invoice Line Items
	fmt.Println(" Seeding invoice line items with proper group and individual breakdown...")
	invoiceItemsSQL := `
		INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, total_cents)
		VALUES 
		-- Inv 001 (Elena)
		('00000000-0000-0000-0004-000000000001', 'Matemáticas Avanzadas (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2500, 20000),
		('00000000-0000-0000-0004-000000000001', 'Masterclass Individual de Piano (Individual) — 4 sesiones (3 asistidas, 1 no justificada facturada)', 4, 3500, 14000),
		-- Inv 002 (Kenji)
		('00000000-0000-0000-0004-000000000002', 'Programación Python & Robótica 101 (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 3000, 24000),
		-- Inv 003 (Amara)
		('00000000-0000-0000-0004-000000000003', 'Inglés B2 First (Cambridge) (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2000, 16000),
		('00000000-0000-0000-0004-000000000003', 'Clase Particular de Física y Química (Individual) — 4 sesiones (4 asistidas)', 4, 3000, 12000),
		-- Inv 004 (Mateo)
		('00000000-0000-0000-0004-000000000004', 'Matemáticas Avanzadas (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2500, 20000),
		-- Inv 005 (Lucía)
		('00000000-0000-0000-0004-000000000005', 'Masterclass Individual de Piano (Individual) — 4 sesiones (3 asistidas, 1 no justificada facturada)', 4, 3500, 14000),
		-- Inv 006 (Carlos)
		('00000000-0000-0000-0004-000000000006', 'Arte Digital & Ilustración (Grupal) — Cuota mensual adelantada (4 sesiones)', 4, 2200, 8800),
		-- Inv 007 (Sofía)
		('00000000-0000-0000-0004-000000000007', 'Matemáticas Avanzadas (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2500, 20000),
		-- Inv 008 (Alejandro)
		('00000000-0000-0000-0004-000000000008', 'Programación Python & Robótica 101 (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 3000, 24000),
		-- Inv 009 (Carmen)
		('00000000-0000-0000-0004-000000000009', 'Inglés B2 First (Cambridge) (Grupal) — Cuota mensual adelantada (8 sesiones)', 8, 2000, 16000),
		-- Inv 010 (David)
		('00000000-0000-0000-0004-000000000010', 'Arte Digital & Ilustración (Grupal) — Cuota mensual adelantada (4 sesiones)', 4, 2200, 8800);
	`
	if _, err := tx.Exec(ctx, invoiceItemsSQL); err != nil {
		log.Fatalf("❌ Error inserting invoice items: %v", err)
	}

	// 5. Commit Transaction
	if err := tx.Commit(ctx); err != nil {
		log.Fatalf("❌ Failed to commit transaction: %v", err)
	}

	fmt.Println("\n==================================================")
	fmt.Println(" ✅ Database reset & freshly seeded successfully! ")
	fmt.Println("==================================================")
	fmt.Println(" Summary of new data:")
	fmt.Println("   - Users:        2 accounts (admin & profesor)")
	fmt.Println("   - Classes:      6 courses (4 Group [advance], 2 Individual [attendance])")
	fmt.Println("   - Schedules:    9 weekly recurring slots")
	fmt.Println("   - Students:     20 students (exact multiple of 10 for batch A4 printing)")
	fmt.Println("   - Enrollments:  22 active student enrollments")
	fmt.Println("   - Attendance:   13 session logs (present, late, unexcused, excused)")
	fmt.Println("   - Invoices:     10 official recibos (ready for 10-per-A4 grid print)")
	fmt.Println("==================================================")
}

