package main

import (
	"SynDataGen/backend/internal/auth"
	"SynDataGen/backend/internal/platform/firestore"
	"SynDataGen/backend/internal/platform/logger"
	"SynDataGen/backend/internal/platform/storage"
	"SynDataGen/backend/internal/project"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	fs "cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
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
func setupRouter(authSvc auth.AuthService, projectSvc project.ProjectService) *gin.Engine {
	router := gin.Default() // Includes logger and recovery middleware

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	// API v1 Group
	apiV1 := router.Group("/api/v1")
	{
		// --- Auth Routes ---
		authRoutes := apiV1.Group("/auth")
		{
			authHandlers := auth.NewAuthHandlers(authSvc)
			authRoutes.POST("/register", authHandlers.Register)
			authRoutes.POST("/login", authHandlers.Login)

			// Apply AuthMiddleware to protected auth routes
			authRequired := authRoutes.Group("/")
			authRequired.Use(auth.AuthMiddleware(authSvc))
			{
				authRequired.GET("/session", authHandlers.GetCurrentUser)
				authRequired.POST("/logout", authHandlers.Logout)
			}
		}

		// --- Project Routes ---
		project.RegisterProjectRoutes(apiV1, authSvc, projectSvc)

		// --- Job Routes ---
		// TODO: Add job routes here, likely under /projects/{projectId}/jobs
		// job.RegisterJobRoutes(apiV1, authSvc, jobSvc, projectSvc) // Example
	}

	return router
}

func main() {
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

	// Initialize Repositories
	userRepo := firestore.NewUserRepository(firestoreClient)
	projectRepo := firestore.NewProjectRepository(firestoreClient)
	// jobRepo := firestore.NewJobRepository(firestoreClient)       // TODO

	// Initialize Services
	storageSvc := storage.NewGCPStorageService()
	authSvc := auth.NewAuthService(userRepo)
	projectSvc := project.NewProjectService(projectRepo, storageSvc)
	// jobSvc := job.NewJobService(jobRepo, projectSvc)    // TODO

	// Setup Router
	router := setupRouter(authSvc, projectSvc)

	// Start Server
	port := getEnv("PORT", "8080")
	logger.Logger.Info("Server starting", zap.String("port", port))
	if err := router.Run(":" + port); err != nil {
		logger.Logger.Fatal("Failed to start server", zap.Error(err))
	}
}
