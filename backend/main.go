package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"sasake-backend/database"
	"sasake-backend/handlers"
	"sasake-backend/store"
)

func main() {
	// 1. Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		_ = godotenv.Load(".env")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 2. Connect to PostgreSQL
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.ConnectPool(ctx)
	if err != nil {
		log.Printf("[WARNING] Could not establish live database connection: %v", err)
		log.Println("[INFO] Server will start, but database-dependent endpoints will return errors until DB is reachable.")
	} else {
		defer pool.Close()
		log.Println("[SUCCESS] Connected to PostgreSQL pool successfully.")
	}

	// 3. Initialize Stores & Handlers
	var studentStore store.StudentStore
	var classStore store.ClassStore
	var attendanceStore store.AttendanceStore
	var invoiceStore store.InvoiceStore
	var userStore store.UserStore
	if pool != nil {
		// Auto-apply schema definitions if database is fresh or empty
		schemaPaths := []string{
			"database/schema.sql",
			"../database/schema.sql",
			"../../database/schema.sql",
		}
		for _, sp := range schemaPaths {
			if data, err := os.ReadFile(sp); err == nil {
				log.Printf("[INFO] Ensuring database schema from %s", sp)
				initCtx, initCancel := context.WithTimeout(context.Background(), 15*time.Second)
				if _, err := pool.Exec(initCtx, string(data)); err != nil {
					log.Printf("[WARNING] Could not apply schema definitions: %v", err)
				} else {
					log.Println("[SUCCESS] Database schema verified and active.")
				}
				initCancel()
				break
			}
		}

		studentStore = store.NewStudentStore(pool)
		classStore = store.NewClassStore(pool)
		attendanceStore = store.NewAttendanceStore(pool)
		invoiceStore = store.NewInvoiceStore(pool)
		userStore = store.NewUserStore(pool)

		// Seed initial admin credentials if not present
		if err := userStore.SeedDefaultUsers(context.Background()); err != nil {
			log.Printf("[WARNING] Could not seed default users: %v", err)
		} else {
			log.Println("[INFO] Default administrative account verified.")
		}

		// Auto-seed development mock data if in development and database is empty
		if err := database.CheckAndSeedDevelopmentData(context.Background(), pool); err != nil {
			log.Printf("[WARNING] Could not auto-seed development data: %v", err)
		}
	}

	// 4. Setup chi Router & Middlewares
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS configuration
	allowedOrigins := []string{"http://localhost:*", "http://127.0.0.1:*"}
	if envOrigins := os.Getenv("ALLOWED_ORIGINS"); envOrigins != "" {
		for _, o := range strings.Split(envOrigins, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			// If ALLOWED_ORIGINS is not explicitly configured, permit access from any origin
			// (useful for local network/LAN academy deployments like 10.4.x.x or 192.168.x.x)
			if os.Getenv("ALLOWED_ORIGINS") == "" {
				return true
			}
			return false
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-User-Role", "X-User-Id"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoint
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "connected"
		if pool == nil || pool.Ping(r.Context()) != nil {
			dbStatus = "disconnected"
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","app":"sasake-backend","database":"%s","time":"%s"}`+"\n", dbStatus, time.Now().Format(time.RFC3339))
	})

	// Mount Subrouters
	r.Route("/api/auth", func(sub chi.Router) {
		if userStore != nil {
			authHandler := handlers.NewAuthHandler(userStore)
			authHandler.RegisterAuthRoutes(sub)
		} else {
			sub.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"database connection unavailable"}`, http.StatusServiceUnavailable)
			})
		}
	})

	r.Route("/api/users", func(sub chi.Router) {
		if userStore != nil {
			authHandler := handlers.NewAuthHandler(userStore)
			authHandler.RegisterUserRoutes(sub)
		} else {
			sub.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"database connection unavailable"}`, http.StatusServiceUnavailable)
			})
		}
	})

	r.Route("/api/students", func(sub chi.Router) {
		if studentStore != nil {
			studentHandler := handlers.NewStudentHandler(studentStore)
			studentHandler.RegisterRoutes(sub)
		} else {
			sub.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"database connection unavailable"}`, http.StatusServiceUnavailable)
			})
		}
	})

	r.Route("/api/classes", func(sub chi.Router) {
		if classStore != nil {
			classHandler := handlers.NewClassHandler(classStore)
			classHandler.RegisterRoutes(sub)
		} else {
			sub.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"database connection unavailable"}`, http.StatusServiceUnavailable)
			})
		}
	})

	r.Route("/api/attendance", func(sub chi.Router) {
		if attendanceStore != nil {
			attendanceHandler := handlers.NewAttendanceHandler(attendanceStore)
			attendanceHandler.RegisterRoutes(sub)
		} else {
			sub.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"database connection unavailable"}`, http.StatusServiceUnavailable)
			})
		}
	})

	r.Route("/api/invoices", func(sub chi.Router) {
		if invoiceStore != nil {
			invoiceHandler := handlers.NewInvoiceHandler(invoiceStore)
			invoiceHandler.RegisterRoutes(sub)
		} else {
			sub.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, `{"error":"database connection unavailable"}`, http.StatusServiceUnavailable)
			})
		}
	})

	// 5. Serve Frontend Static Assets (Single-Port Unified Deployment)
	distCandidates := []string{
		"../frontend/dist",
		"./frontend/dist",
		"dist",
	}
	var distDir string
	for _, candidate := range distCandidates {
		if stat, err := os.Stat(candidate); err == nil && stat.IsDir() {
			distDir = candidate
			break
		}
	}

	if distDir != "" {
		log.Printf("[INFO] Serving static frontend application from: %s", distDir)
		fs := http.FileServer(http.Dir(distDir))
		r.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api") {
				http.NotFound(w, r)
				return
			}
			filePath := filepath.Join(distDir, filepath.Clean(r.URL.Path))
			if stat, err := os.Stat(filePath); err == nil && !stat.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			// SPA Client-Side Route Fallback
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
		})
	} else {
		log.Println("[INFO] Frontend dist directory not found. Serving API endpoints only.")
	}

	// 6. Start Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("SasaKe backend server listening on port :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down server gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	log.Println("Server stopped.")
}
