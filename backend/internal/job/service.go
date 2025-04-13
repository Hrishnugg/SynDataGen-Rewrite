package job

import (
	"SynDataGen/backend/internal/core"
	"context"
)

// --- Data Transfer Objects (DTOs) ---

// CreateJobRequest defines the data needed to create a new job.
// Based on core.Job, but might exclude fields set by the system (ID, Status, CreatedAt etc.)
// and potentially include other request-specific info.
type CreateJobRequest struct {
	ProjectID string `json:"projectId" binding:"required"`
	JobType   string `json:"jobType" binding:"required"`
	JobConfig string `json:"jobConfig" binding:"required"` // Assuming config is passed as a JSON string for now
	// Add other fields like specific schema details if config is not a generic string
}

// ListJobsResponse defines the structure for the list jobs endpoint response.
type ListJobsResponse struct {
	Jobs   []*core.Job `json:"jobs"`
	Total  int         `json:"total"`
	Limit  int         `json:"limit"`
	Offset int         `json:"offset"`
}

// --- Service Interface ---

// JobService defines the interface for job-related business logic.
type JobService interface {
	// CreateJob handles the logic for creating a new job.
	// It validates the request, checks user permissions for the project,
	// creates the job record, and potentially triggers the job execution asynchronously.
	// Requires the ID of the user creating the job and the request details.
	CreateJob(ctx context.Context, userID string, req CreateJobRequest) (*core.Job, error)

	// GetJobByID retrieves a specific job by its ID.
	// It should check if the caller has permission to view the job (e.g., belongs to the same project).
	GetJobByID(ctx context.Context, jobID string, callerID string) (*core.Job, error)

	// ListJobsByProjectID retrieves jobs for a specific project.
	// It checks user permissions for the project and applies pagination.
	ListJobsByProjectID(ctx context.Context, projectID string, callerID string, limit, offset int) (*ListJobsResponse, error)

	// TODO: Add methods for updating job status (likely called internally by workers),
	// cancelling jobs, or retrieving job results/artifacts.
}
