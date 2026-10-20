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
	"sasake-backend/store"
)

func main() {
	fmt.Println("==================================================")
	fmt.Println("       SasaKe Database Initializer & Migration     ")
	fmt.Println("==================================================")

	// 1. Try finding and loading .env
	envPaths := []string{".env", "../.env", "../../.env"}
	loaded := false
	for _, p := range envPaths {
		if err := godotenv.Load(p); err == nil {
			fmt.Printf(" Loaded environment configuration from: %s\n", p)
			loaded = true
			break
		}
	}
	if !loaded {
		fmt.Println("ℹ Using system environment variables (no .env found in default paths).")
	}

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	dbUser := os.Getenv("DB_USER")
	fmt.Printf(" Connecting to database: %s@%s:%s/%s\n", dbUser, dbHost, dbPort, dbName)

	// 2. Connect to Database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.ConnectPool(ctx)
	if err != nil {
		fmt.Println("\n❌ Failed to connect to PostgreSQL:")
		fmt.Printf("   Error: %v\n\n", err)
		fmt.Println("Troubleshooting suggestions:")
		fmt.Println(" 1. If running locally via Docker, ensure the PostgreSQL container is running:")
		fmt.Printf("    docker run --name sasake-postgres -e POSTGRES_USER=%s -e POSTGRES_PASSWORD=<password> -e POSTGRES_DB=%s -p 5432:5432 -d postgres:16-alpine\n", dbUser, dbName)
		fmt.Println(" 2. If running remotely or in cloud, verify the host IP, firewall, and VPN connection.")
		fmt.Println(" 3. Check your .env credentials (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).")
		os.Exit(1)
	}
	defer pool.Close()

	fmt.Println(" Live connection to PostgreSQL established successfully.")

	// 3. Locate schema.sql
	schemaPaths := []string{
		"database/schema.sql",
		"../database/schema.sql",
		"../../database/schema.sql",
	}

	var schemaContent []byte
	var resolvedPath string
	for _, sp := range schemaPaths {
		abs, _ := filepath.Abs(sp)
		data, err := os.ReadFile(abs)
		if err == nil {
			schemaContent = data
			resolvedPath = abs
			break
		}
	}

	if schemaContent == nil {
		log.Fatalf("❌ Could not find database/schema.sql in paths: %v", schemaPaths)
	}

	fmt.Printf(" Executing schema definitions from: %s\n", resolvedPath)

	// 4. Execute schema SQL
	execCtx, execCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer execCancel()

	if _, err := pool.Exec(execCtx, string(schemaContent)); err != nil {
		log.Fatalf("❌ Failed to execute schema.sql: %v", err)
	}

	fmt.Println(" Table definitions & extensions created successfully:")
	fmt.Println("   - students")
	fmt.Println("   - classes")
	fmt.Println("   - enrollments")
	fmt.Println("   - class_schedules")
	fmt.Println("   - attendance")
	fmt.Println("   - invoices")
	fmt.Println("   - invoice_items")
	fmt.Println("   - users")

	// 5. Seed default admin & teacher accounts
	userStore := store.NewUserStore(pool)
	if err := userStore.SeedDefaultUsers(execCtx); err != nil {
		log.Printf("⚠️ Warning seeding default accounts: %v", err)
	} else {
		fmt.Println(" Default user accounts seeded:")
		fmt.Println("   - Admin:    admin@encina.com / admin (Role: admin)")
		fmt.Println("   - Teacher:  profesor@encina.com / profesor (Role: teacher)")
	}

	fmt.Println("\n==================================================")
	fmt.Println(" Database initialized successfully for SasaKe!")
	fmt.Println("==================================================")
}
