package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"sasake-backend/database"
	"sasake-backend/utils"
)

func main() {
	// 1. CLI Flags
	usernameFlag := flag.String("username", "admin", "Username for the account")
	passwordFlag := flag.String("password", "admin123", "Password for the account")
	emailFlag := flag.String("email", "", "Email for the account (default: <username>@encina.com)")
	nameFlag := flag.String("name", "Administrador Encina", "Full name of the user")
	roleFlag := flag.String("role", "admin", "Role: admin or teacher")
	interactiveFlag := flag.Bool("interactive", false, "Prompt for values interactively")
	flag.Parse()

	// 2. Load .env
	for _, p := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}

	username := strings.TrimSpace(*usernameFlag)
	password := strings.TrimSpace(*passwordFlag)
	email := strings.TrimSpace(*emailFlag)
	fullName := strings.TrimSpace(*nameFlag)
	role := strings.ToLower(strings.TrimSpace(*roleFlag))

	if *interactiveFlag {
		reader := bufio.NewReader(os.Stdin)

		fmt.Printf("Enter Username [%s]: ", username)
		if input, _ := reader.ReadString('\n'); strings.TrimSpace(input) != "" {
			username = strings.TrimSpace(input)
		}

		fmt.Printf("Enter Password [%s]: ", password)
		if input, _ := reader.ReadString('\n'); strings.TrimSpace(input) != "" {
			password = strings.TrimSpace(input)
		}

		defaultEmail := email
		if defaultEmail == "" {
			defaultEmail = fmt.Sprintf("%s@encina.com", strings.ToLower(username))
		}
		fmt.Printf("Enter Email [%s]: ", defaultEmail)
		if input, _ := reader.ReadString('\n'); strings.TrimSpace(input) != "" {
			email = strings.TrimSpace(input)
		} else {
			email = defaultEmail
		}

		fmt.Printf("Enter Full Name [%s]: ", fullName)
		if input, _ := reader.ReadString('\n'); strings.TrimSpace(input) != "" {
			fullName = strings.TrimSpace(input)
		}

		fmt.Printf("Enter Role (admin/teacher) [%s]: ", role)
		if input, _ := reader.ReadString('\n'); strings.TrimSpace(input) != "" {
			role = strings.ToLower(strings.TrimSpace(input))
		}
	}

	if email == "" {
		email = fmt.Sprintf("%s@encina.com", strings.ToLower(username))
	}
	if role != "admin" && role != "teacher" {
		role = "admin"
	}

	// 3. Hash password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("Error hashing password: %v", err)
	}

	// 4. Connect to database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.ConnectPool(ctx)
	if err != nil {
		fmt.Println("\n❌ Could not connect to PostgreSQL directly from this environment.")
		fmt.Println("   You can execute this exact SQL statement directly in your database/container:")
		fmt.Println("--------------------------------------------------------------------------------")
		printSQL(username, email, fullName, hashedPassword, role)
		fmt.Println("--------------------------------------------------------------------------------")
		return
	}
	defer pool.Close()

	// 5. Upsert User in database
	query := `
		INSERT INTO users (email, username, password_hash, full_name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
		ON CONFLICT (username) DO UPDATE SET
			password_hash = EXCLUDED.password_hash,
			email = EXCLUDED.email,
			full_name = EXCLUDED.full_name,
			role = EXCLUDED.role,
			is_active = TRUE,
			updated_at = NOW()
	`

	_, err = pool.Exec(ctx, query, strings.ToLower(email), strings.ToLower(username), hashedPassword, fullName, role)
	if err != nil {
		log.Fatalf("❌ Failed to insert/update user: %v", err)
	}

	fmt.Printf("\n✅ User '%s' (%s) successfully created/updated in database!\n", username, role)
	fmt.Printf("   Email:    %s\n", email)
	fmt.Printf("   Role:     %s\n", role)
	fmt.Printf("   Password: %s\n\n", password)
	fmt.Println("You can now log in to the web platform with these credentials.")
}

func printSQL(username, email, fullName, hash, role string) {
	fmt.Printf(`INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    '%s',
    '%s',
    '%s',
    '%s',
    '%s',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();
`+"\n", strings.ToLower(email), strings.ToLower(username), hash, fullName, role)
}
