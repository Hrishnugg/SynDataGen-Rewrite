package main

import (
	"SynDataGen/backend/internal/auth"
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/job"
	"SynDataGen/backend/internal/platform/firestore"
	"SynDataGen/backend/internal/platform/logger"
	"SynDataGen/backend/internal/platform/pipeline"
	"SynDataGen/backend/internal/platform/storage"
	"SynDataGen/backend/internal/project"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	fs "cloud.google.com/go/firestore"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

// Helper to get environment variable with fallback
// (Could be moved to a shared utils package)
func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		log.Printf("Warning: Environment variable %s not set, using default: %s", key, fallback)
		return fallback
	}
	return value
}

// initFirestore initializes the Firestore client.
// In a real app, consider more robust error handling and configuration.
func initFirestore(ctx context.Context) (*fs.Client, error) {
	projectID := getEnv("GCP_PROJECT_ID", "") // Use helper, fallback to empty
	if projectID == "" {
		logger.Logger.Error("CRITICAL: GCP_PROJECT_ID environment variable not set. Firestore functionality may fail.")
		// Decide if we should return an error or try to continue
		// return nil, errors.New("GCP_PROJECT_ID not set")
	}

	// Requires Application Default Credentials to be set up.
	// See https://cloud.google.com/docs/authentication/provide-credentials-adc
	client, err := fs.NewClient(ctx, projectID)
	if err != nil {
		logger.Logger.Error("Failed to create Firestore client", zap.Error(err))
		return nil, fmt.Errorf("firestore.NewClient: %w", err)
	}
	logger.Logger.Info("Firestore client initialized successfully", zap.String("projectID", projectID))
	return client, nil
}

// setupRouter configures the Gin router with routes and handlers.
// Pass core.StorageService for type safety
func setupRouter(authSvc auth.AuthService, projectSvc project.ProjectService, jobSvc job.JobService, storageSvc core.StorageService) *gin.Engine {
	router := gin.Default() // Includes logger and recovery middleware

	// Add CORS middleware configuration
	router.Use(cors.New(cors.Config{
		// Allow origins - Use environment variable or be specific for dev
		// AllowOrigins:     []string{"http://localhost:3000", "https://your-prod-domain.com"},
		AllowOrigins:     []string{"http://localhost:3000"}, // For local testing
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"}, // Add Authorization if needed later
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	// API v1 Group
	apiV1 := router.Group("/api/v1")
	{
		// --- Auth Routes (Manual Registration) ---
		authHandlers := auth.NewAuthHandlers(authSvc)
		authRoutes := apiV1.Group("/auth")
		{
			authRoutes.POST("/register", authHandlers.Register)
			authRoutes.POST("/login", authHandlers.Login)

			// Apply AuthMiddleware to protected auth routes
			authRequired := authRoutes.Group("")
			authRequired.Use(auth.AuthMiddleware(authSvc))
			{
				authRequired.GET("/session", authHandlers.GetCurrentUser)
				authRequired.POST("/logout", authHandlers.Logout)
			}
		}

		// --- Project Routes ---
		project.RegisterProjectRoutes(apiV1, authSvc, projectSvc, storageSvc)

		// --- Job Routes ---
		jobHandlers := job.NewJobHandler(jobSvc)
		jobHandlers.RegisterRoutes(apiV1, auth.AuthMiddleware(authSvc))
	}

	return router
}

func main() {
	// Load .env file.
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	// Ensure logger syncs before exit
	defer logger.Sync()

	logger.Logger.Info("Starting SynDataGen Backend API...")
	ctx := context.Background()

	// Initialize Firestore
	firestoreClient, err := initFirestore(ctx)
	if err != nil {
		// Use standard log for fatal startup errors as zap might not be fully functional
		log.Fatalf("Failed to initialize Firestore: %v", err)
	}
	// Ensure client is closed on exit
	defer func() {
		if err := firestoreClient.Close(); err != nil {
			logger.Logger.Error("Failed to close Firestore client", zap.Error(err))
		}
	}()

	// Create Repositories
	userRepo := firestore.NewUserRepository(firestoreClient)
	projectRepo := firestore.NewProjectRepository(firestoreClient)
	jobRepo := firestore.NewJobRepository(firestoreClient, logger.Logger)

	// Storage Service Initialization
	storageCfg := storage.Config{
		GCPProjectID: getEnv("GCP_PROJECT_ID", ""),
		Logger:       log.Default(),
	}
	storageSvcInstance, err := storage.NewGCPStorageService(ctx, storageCfg)
	if err != nil {
		logger.Logger.Fatal("Failed to initialize GCP Storage service", zap.Error(err))
	}
	defer storageSvcInstance.Close()
	logger.Logger.Info("GCP Storage service initialized successfully")

	// Pipeline Client (Stub for now, pass logger)
	pipelineClient := pipeline.NewStubPipelineClient(log.Default())
	logger.Logger.Info("Stub Pipeline client initialized")

	// --- Service Initializations ---
	authSvc := auth.NewAuthService(userRepo)
	projectSvc := project.NewProjectService(projectRepo, userRepo, storageSvcInstance)
	jobSvc := job.NewJobService(jobRepo, projectSvc, pipelineClient)

	// Setup Router
	router := setupRouter(authSvc, projectSvc, jobSvc, storageSvcInstance)

	// Start Server
	port := getEnv("PORT", "8080")
	logger.Logger.Info("Server starting", zap.String("port", port))
	if err := router.Run(":" + port); err != nil {
		logger.Logger.Fatal("Failed to start server", zap.Error(err))
	}
}
