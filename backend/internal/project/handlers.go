package project

import (
	"SynDataGen/backend/internal/auth" // Need this for GetUserIDFromContext
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"errors"
	"fmt"
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

		// Team Management Routes
		teamRoutes := protectedRoutes.Group("/:projectId/team")
		{
			teamRoutes.POST("", h.InviteMember)                  // Invite a member
			teamRoutes.PUT("/:memberId", h.UpdateTeamMemberRole) // Update a member's role
			teamRoutes.DELETE("/:memberId", h.RemoveTeamMember)  // Remove a member (or self-leave)
		}
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

// UpdateTeamMemberRole handles PUT /projects/:projectId/team/:memberId
func (h *ProjectHandlers) UpdateTeamMemberRole(c *gin.Context) {
	projectID := c.Param("projectId")
	memberID := c.Param("memberId") // User ID of the member whose role is being changed

	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	var req UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Handle validation errors from `binding:"required,oneof=..."`
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT", "message": err.Error()})
		return
	}

	// Validate the requested role from the DTO (already done by binding, but good practice)
	if req.Role != core.RoleAdmin && req.Role != core.RoleMember && req.Role != core.RoleViewer {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_ROLE", "message": "Invalid role specified. Must be admin, member, or viewer."}) // Redundant due to binding oneof
		return
	}

	project, err := h.Svc.UpdateMemberRole(c.Request.Context(), projectID, callerID, memberID, req.Role)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "PROJECT_NOT_FOUND", "message": err.Error()})
		} else if errors.Is(err, ErrProjectAccessDenied) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ACCESS_DENIED", "message": err.Error()})
		} else if errors.Is(err, ErrProjectUpdateFailed) {
			logger.Logger.Error("Failed to update member role (service error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", memberID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "UPDATE_MEMBER_FAILED", "message": "Internal server error updating member role"})
		} else {
			// Handle specific validation errors from the service (like member not found, cannot change owner, etc.)
			// For now, map them to BadRequest or Forbidden depending on context
			logger.Logger.Warn("Failed to update member role (validation error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", memberID))
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "UPDATE_MEMBER_FAILED", "message": err.Error()}) // Or http.StatusForbidden depending on the error
		}
		return
	}

	// Return the updated project (including the updated team list)
	c.JSON(http.StatusOK, project)
}

// RemoveTeamMember handles DELETE /projects/:projectId/team/:memberId
func (h *ProjectHandlers) RemoveTeamMember(c *gin.Context) {
	projectID := c.Param("projectId")
	memberID := c.Param("memberId") // User ID of the member to be removed

	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	project, err := h.Svc.RemoveMember(c.Request.Context(), projectID, callerID, memberID)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "PROJECT_NOT_FOUND", "message": err.Error()})
		} else if errors.Is(err, ErrProjectAccessDenied) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ACCESS_DENIED", "message": err.Error()})
		} else if errors.Is(err, ErrProjectUpdateFailed) {
			logger.Logger.Error("Failed to remove member (service error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", memberID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "REMOVE_MEMBER_FAILED", "message": "Internal server error removing member"})
		} else {
			// Handle specific validation errors from the service (like member not found, cannot remove owner, etc.)
			logger.Logger.Warn("Failed to remove member (validation error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", memberID))
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "REMOVE_MEMBER_FAILED", "message": err.Error()})
		}
		return
	}

	// Return the updated project state (or StatusNoContent if preferred)
	c.JSON(http.StatusOK, project) // Returning the updated project shows the member removed
	// Or: c.Status(http.StatusNoContent)
}

// InviteMember handles POST /projects/:projectId/team
func (h *ProjectHandlers) InviteMember(c *gin.Context) {
	projectID := c.Param("projectId")

	callerID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED", "message": "User ID not found in context"})
		return
	}

	var req InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Handle validation errors (e.g., missing userId, invalid role enum)
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT", "message": err.Error()})
		return
	}

	// Call the service
	project, err := h.Svc.InviteMember(c.Request.Context(), projectID, callerID, req)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "PROJECT_NOT_FOUND", "message": err.Error()})
		} else if errors.Is(err, ErrProjectAccessDenied) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ACCESS_DENIED", "message": err.Error()})
		} else if errors.Is(err, ErrProjectUpdateFailed) {
			logger.Logger.Error("Failed to invite member (service error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", req.UserID))
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "INVITE_MEMBER_FAILED", "message": "Internal server error inviting member"})
		} else {
			// Handle specific validation errors from the service (user already member, user not found)
			logger.Logger.Warn("Failed to invite member (validation error)", zap.Error(err), zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", req.UserID))
			// Map these specific validation errors to 400 Bad Request or 404 Not Found as appropriate
			if err.Error() == fmt.Sprintf("user with ID %s not found", req.UserID) {
				c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "USER_NOT_FOUND", "message": err.Error()})
			} else {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVITE_MEMBER_FAILED", "message": err.Error()})
			}
		}
		return
	}

	// Return the updated project with the new member
	c.JSON(http.StatusOK, project)
}
