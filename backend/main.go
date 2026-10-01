package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
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
	if pool != nil {
		studentStore = store.NewStudentStore(pool)
	}

	// 4. Setup chi Router & Middlewares
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
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

	// 5. Start Server with Graceful Shutdown
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
