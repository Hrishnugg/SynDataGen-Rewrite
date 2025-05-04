package job

import (
	"SynDataGen/backend/internal/auth"
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CreateJobRequest defines the expected JSON body for creating a job.
// Struct tags are used by Gin for binding and validation.
type CreateJobRequest struct {
	ProjectID string `json:"projectId" binding:"required"`
	JobType   string `json:"jobType" binding:"required"`
	JobConfig string `json:"jobConfig" binding:"required"`
}

// JobHandler handles HTTP requests for jobs.
type JobHandler struct {
	service JobService
}

// NewJobHandler creates a new JobHandler.
func NewJobHandler(s JobService) *JobHandler {
	return &JobHandler{
		service: s,
	}
}

// RegisterRoutes registers job routes with the Gin router group.
// Note: These routes are typically nested under projects, e.g., /api/v1/projects/:projectId/jobs
// or potentially top-level /api/v1/jobs/:jobId for direct access.
// This example shows both patterns.
func (h *JobHandler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	// Routes nested under projects
	projectJobs := rg.Group("/projects/:projectId/jobs")
	projectJobs.Use(authMiddleware) // Apply auth middleware
	{
		projectJobs.POST("", h.CreateJob)        // POST /api/v1/projects/:projectId/jobs
		projectJobs.GET("", h.ListJobsByProject) // GET /api/v1/projects/:projectId/jobs
	}

	// Route for getting a specific job by its ID and performing actions
	jobSpecific := rg.Group("/jobs")
	jobSpecific.Use(authMiddleware) // Apply auth middleware
	{
		jobSpecific.GET("/:jobId", h.GetJob)              // GET /api/v1/jobs/:jobId
		jobSpecific.POST("/:jobId/submit", h.SubmitJob)   // POST /api/v1/jobs/:jobId/submit
		jobSpecific.DELETE("/:jobId", h.CancelJob)        // DELETE /api/v1/jobs/:jobId (Assume maps to Cancel)
		jobSpecific.POST("/:jobId/sync", h.SyncJobStatus) // POST /api/v1/jobs/:jobId/sync
	}

	// Route for listing all jobs accessible by the user
	allJobs := rg.Group("/jobs") // Reusing /jobs group, or could be separate
	allJobs.Use(authMiddleware)
	{
		allJobs.GET("", h.ListAllJobs) // GET /api/v1/jobs
	}

	// TODO: Add routes for getting results etc.
}

// CreateJob handles POST /projects/:projectId/jobs requests.
func (h *JobHandler) CreateJob(c *gin.Context) {
	projectID := c.Param("projectId")
	userID, ok := c.Get(auth.UserIDKey) // Extract userID set by AuthMiddleware
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during CreateJob")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	var req CreateJobRequest
	// Bind JSON and check for validation errors (from struct tags like `binding:"required"`)
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Logger.Warn("Invalid request body for CreateJob", zap.Error(err))
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Ensure the project ID in the path matches the one in the body.
	if req.ProjectID != projectID {
		logger.Logger.Warn("Project ID mismatch between path and body", zap.String("pathProjectId", projectID), zap.String("bodyProjectId", req.ProjectID))
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Project ID mismatch between URL path and request body"})
		return
	}

	// Call the service method with the correct arguments: context, projectID (from path), userID, request body struct
	job, err := h.service.CreateJob(c.Request.Context(), projectID, userID.(string), req)
	if err != nil {
		logger.Logger.Error("Failed to create job via service", zap.Error(err), zap.String("userId", userID.(string)), zap.String("projectId", projectID))
		if errors.Is(err, core.ErrNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		} else if errors.Is(err, core.ErrForbidden) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to create jobs in this project"})
		} else {
			// Consider mapping other specific service errors to 4xx codes if appropriate
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job"})
		}
		return
	}

	c.JSON(http.StatusCreated, job)
}

// GetJob handles GET /jobs/:jobId requests.
func (h *JobHandler) GetJob(c *gin.Context) {
	jobID := c.Param("jobId")
	userID, ok := c.Get(auth.UserIDKey)
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during GetJob")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	job, err := h.service.GetJobByID(c.Request.Context(), jobID, userID.(string))
	if err != nil {
		logger.Logger.Error("Failed to get job via service", zap.Error(err), zap.String("userId", userID.(string)), zap.String("jobId", jobID))
		if errors.Is(err, core.ErrNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		} else if errors.Is(err, core.ErrForbidden) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to view this job"})
		} else {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve job"})
		}
		return
	}

	c.JSON(http.StatusOK, job)
}

// ListJobsByProject handles GET /projects/:projectId/jobs requests.
func (h *JobHandler) ListJobsByProject(c *gin.Context) {
	projectID := c.Param("projectId")
	userID, ok := c.Get(auth.UserIDKey)
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during ListJobsByProject")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	// Get pagination parameters from query string
	limitStr := c.DefaultQuery("limit", "20")  // Default limit 20
	offsetStr := c.DefaultQuery("offset", "0") // Default offset 0

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		logger.Logger.Warn("Invalid limit parameter", zap.String("limit", limitStr))
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid 'limit' query parameter"})
		return
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		logger.Logger.Warn("Invalid offset parameter", zap.String("offset", offsetStr))
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid 'offset' query parameter"})
		return
	}

	// Call the renamed service method
	jobs, total, err := h.service.ListJobsByProject(c.Request.Context(), projectID, userID.(string), limit, offset)
	if err != nil {
		logger.Logger.Error("Failed to list jobs via service", zap.Error(err), zap.String("userId", userID.(string)), zap.String("projectId", projectID))
		if errors.Is(err, core.ErrNotFound) {
			// This implies the project itself wasn't found or accessible
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Project not found or not accessible"})
		} else if errors.Is(err, core.ErrForbidden) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to list jobs in this project"})
		} else {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to list jobs"})
		}
		return
	}

	// Create the response structure (consider defining ListJobsResponse here or elsewhere)
	resp := gin.H{
		"jobs":   jobs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}
	c.JSON(http.StatusOK, resp)
}

// SubmitJob handles POST /jobs/:jobId/submit requests.
func (h *JobHandler) SubmitJob(c *gin.Context) {
	jobID := c.Param("jobId")
	userID, ok := c.Get(auth.UserIDKey)
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during SubmitJob")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	job, err := h.service.SubmitJob(c.Request.Context(), jobID, userID.(string))
	if err != nil {
		logger.Logger.Error("Failed to submit job via service", zap.Error(err), zap.String("userId", userID.(string)), zap.String("jobId", jobID))
		if errors.Is(err, core.ErrNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		} else if errors.Is(err, core.ErrForbidden) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to submit this job"})
		} else if strings.Contains(err.Error(), "cannot be submitted") { // Check for specific service error message
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_JOB_STATUS", "message": err.Error()})
		} else if strings.Contains(err.Error(), "pipeline submission failed") { // Check for pipeline error
			// Return the updated job status (likely Failed) and the error message
			c.JSON(http.StatusInternalServerError, gin.H{"error": "PIPELINE_SUBMIT_FAILED", "message": err.Error(), "job": job})
			return // Avoid aborting here, return the JSON
		} else {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit job"})
		}
		return
	}

	c.JSON(http.StatusOK, job) // Return the updated job state (likely Running)
}

// CancelJob handles DELETE /jobs/:jobId requests.
func (h *JobHandler) CancelJob(c *gin.Context) {
	jobID := c.Param("jobId")
	userID, ok := c.Get(auth.UserIDKey)
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during CancelJob")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	job, err := h.service.CancelJob(c.Request.Context(), jobID, userID.(string))
	if err != nil {
		logger.Logger.Error("Failed to cancel job via service", zap.Error(err), zap.String("userId", userID.(string)), zap.String("jobId", jobID))
		if errors.Is(err, core.ErrNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		} else if errors.Is(err, core.ErrForbidden) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to cancel this job"})
		} else if strings.Contains(err.Error(), "cannot be cancelled") { // Check for specific service error
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_JOB_STATUS", "message": err.Error()})
		} else {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel job"})
		}
		return
	}

	c.JSON(http.StatusOK, job) // Return updated job status (Cancelled)
}

// SyncJobStatus handles POST /jobs/:jobId/sync requests.
func (h *JobHandler) SyncJobStatus(c *gin.Context) {
	jobID := c.Param("jobId")
	userID, ok := c.Get(auth.UserIDKey)
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during SyncJobStatus")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	job, err := h.service.SyncJobStatus(c.Request.Context(), jobID, userID.(string))
	if err != nil {
		logger.Logger.Error("Failed to sync job status via service", zap.Error(err), zap.String("userId", userID.(string)), zap.String("jobId", jobID))
		if errors.Is(err, core.ErrNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		} else if errors.Is(err, core.ErrForbidden) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to view this job"})
		} else if strings.Contains(err.Error(), "failed to check pipeline status") {
			// Error checking status, but don't necessarily fail the job
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "PIPELINE_CHECK_FAILED", "message": err.Error()})
		} else {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync job status"})
		}
		return
	}

	c.JSON(http.StatusOK, job) // Return potentially updated job status
}

// ListAllJobs handles GET /jobs requests.
func (h *JobHandler) ListAllJobs(c *gin.Context) {
	userID, ok := c.Get(auth.UserIDKey)
	if !ok || userID == "" {
		logger.Logger.Error("UserID not found in context during ListAllJobs")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID missing"})
		return
	}

	// Get pagination and filter parameters from query string
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	statusFilter := c.DefaultQuery("status", "") // Optional status filter

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 20
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Call the service method
	jobs, total, err := h.service.ListAllAccessibleJobs(c.Request.Context(), userID.(string), statusFilter, limit, offset)
	if err != nil {
		logger.Logger.Error("Failed to list all accessible jobs via service", zap.Error(err), zap.String("userId", userID.(string)))
		// Check for specific errors if the service layer returns them
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to list jobs"})
		return
	}

	// Create the response structure
	resp := gin.H{
		"jobs":   jobs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}
	c.JSON(http.StatusOK, resp)
}
