package project

import (
	"SynDataGen/backend/internal/auth" // Need this for GetUserIDFromContext
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ProjectHandlers holds the dependencies for project handlers.
type ProjectHandlers struct {
	Svc ProjectService
}

// NewProjectHandlers creates a new set of project handlers.
func NewProjectHandlers(svc ProjectService) *ProjectHandlers {
	return &ProjectHandlers{Svc: svc}
}

// RegisterProjectRoutes registers project routes with the Gin router group.
// It applies the authentication middleware.
func RegisterProjectRoutes(rg *gin.RouterGroup, authSvc auth.AuthService, projectSvc ProjectService) {
	// Use the auth middleware created in the auth package
	authMiddleware := auth.AuthMiddleware(authSvc)

	h := NewProjectHandlers(projectSvc)

	// Group routes that require authentication
	protectedRoutes := rg.Group("/projects")
	protectedRoutes.Use(authMiddleware) // Apply auth middleware to all project routes
	{
		protectedRoutes.POST("", h.CreateProject)
		protectedRoutes.GET("", h.ListProjects)
		protectedRoutes.GET("/:projectId", h.GetProject)
		protectedRoutes.PATCH("/:projectId", h.UpdateProject) // Using PATCH for partial updates
		protectedRoutes.DELETE("/:projectId", h.DeleteProject)
		// TODO: Add routes for team member management (/projects/{projectId}/members)
	}
}

// CreateProject handles POST /projects requests.
func (h *ProjectHandlers) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT", "message": err.Error()})
		return
	}

	// Get caller ID from context (set by AuthMiddleware)
	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		// This should ideally not happen if middleware is correctly applied
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	// Call the service (using callerID as customerID for now, adjust if needed)
	project, err := h.Svc.CreateProject(c.Request.Context(), callerID, req)
	if err != nil {
		if errors.Is(err, ErrBucketCreationFailed) {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "BUCKET_CREATION_FAILED", "message": err.Error()})
		} else {
			logger.Logger.Error("Failed to create project", zap.Error(err), zap.String("callerID", callerID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "CREATE_PROJECT_FAILED", "message": "Internal server error creating project"})
		}
		return
	}

	c.JSON(http.StatusCreated, project)
}

// ListProjects handles GET /projects requests.
func (h *ProjectHandlers) ListProjects(c *gin.Context) {
	// Get caller ID from context
	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	// Parse query parameters
	statusFilter := c.DefaultQuery("status", "active") // Default to active?
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 20 // Default or handle error
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0 // Default or handle error
	}

	// Call the service
	listResp, err := h.Svc.ListProjects(c.Request.Context(), callerID, statusFilter, limit, offset)
	if err != nil {
		logger.Logger.Error("Failed to list projects", zap.Error(err), zap.String("callerID", callerID))
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "LIST_PROJECTS_FAILED", "message": "Internal server error listing projects"})
		return
	}

	// Ensure Projects slice is never nil in the JSON response
	if listResp.Projects == nil {
		listResp.Projects = []*core.Project{}
	}

	c.JSON(http.StatusOK, listResp)
}

// GetProject handles GET /projects/{projectId} requests.
func (h *ProjectHandlers) GetProject(c *gin.Context) {
	projectID := c.Param("projectId")

	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	project, err := h.Svc.GetProjectByID(c.Request.Context(), projectID, callerID)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "PROJECT_NOT_FOUND", "message": err.Error()})
		} else if errors.Is(err, ErrProjectAccessDenied) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ACCESS_DENIED", "message": err.Error()})
		} else {
			logger.Logger.Error("Failed to get project", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "GET_PROJECT_FAILED", "message": "Internal server error getting project"})
		}
		return
	}

	c.JSON(http.StatusOK, project)
}

// UpdateProject handles PATCH /projects/{projectId} requests.
func (h *ProjectHandlers) UpdateProject(c *gin.Context) {
	projectID := c.Param("projectId")

	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT", "message": err.Error()})
		return
	}

	project, err := h.Svc.UpdateProject(c.Request.Context(), projectID, callerID, req)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "PROJECT_NOT_FOUND", "message": err.Error()})
		} else if errors.Is(err, ErrProjectAccessDenied) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ACCESS_DENIED", "message": err.Error()})
		} else if errors.Is(err, ErrProjectUpdateFailed) {
			logger.Logger.Error("Failed to update project (service error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "UPDATE_PROJECT_FAILED", "message": err.Error()})
		} else {
			logger.Logger.Error("Failed to update project (unknown error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "UPDATE_PROJECT_FAILED", "message": "Internal server error updating project"})
		}
		return
	}

	c.JSON(http.StatusOK, project)
}

// DeleteProject handles DELETE /projects/{projectId} requests.
func (h *ProjectHandlers) DeleteProject(c *gin.Context) {
	projectID := c.Param("projectId")

	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	err := h.Svc.DeleteProject(c.Request.Context(), projectID, callerID)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			// Deleting a non-existent project might be considered idempotent
			c.Status(http.StatusNoContent)
		} else if errors.Is(err, ErrProjectAccessDenied) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ACCESS_DENIED", "message": err.Error()})
		} else if errors.Is(err, ErrBucketDeletionFailed) {
			logger.Logger.Error("Failed to delete project (bucket error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "DELETE_PROJECT_FAILED", "message": "Failed to delete associated storage"})
		} else {
			logger.Logger.Error("Failed to delete project (unknown error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "DELETE_PROJECT_FAILED", "message": "Internal server error deleting project"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
