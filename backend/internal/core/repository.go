package core

import (
	"context"
	"errors"
	"time"
)

// Standard application errors
var (
	ErrNotFound  = errors.New("resource not found")
	ErrForbidden = errors.New("user does not have permission for this action")
	// Add other common errors like ErrConflict, ErrBadRequest etc.
)

// UserRepository defines the interface for interacting with user data storage.
type UserRepository interface {
	// GetUserByEmail retrieves a user by their email address.
	// Returns nil, nil if the user is not found.
	GetUserByEmail(ctx context.Context, email string) (*User, error)

	// CreateUser saves a new user to the storage.
	// Returns an error if the user (e.g., based on email) already exists.
	CreateUser(ctx context.Context, user *User) (string, error) // Returns user ID

	// GetUserByID retrieves a user by their unique ID.
	GetUserByID(ctx context.Context, id string) (*User, error)
}

// ProjectRepository defines the interface for interacting with project data storage.
type ProjectRepository interface {
	// CreateProject saves a new project.
	CreateProject(ctx context.Context, project *Project) (string, error) // Returns project ID

	// GetProjectByID retrieves a project by its unique ID.
	GetProjectByID(ctx context.Context, id string) (*Project, error)

	// ListProjects retrieves a list of projects, potentially filtered by customer ID and status.
	// Supports pagination via limit and offset.
	ListProjects(ctx context.Context, customerID string, statusFilter string, limit, offset int) ([]*Project, error)

	// CountProjects retrieves the total count of projects matching filters.
	CountProjects(ctx context.Context, customerID string, statusFilter string) (int, error)

	// UpdateProject updates an existing project.
	UpdateProject(ctx context.Context, project *Project) error

	// DeleteProject removes a project (or marks it as deleted).
	// The implementation decides if this is a hard or soft delete.
	DeleteProject(ctx context.Context, id string) error
}

// JobRepository defines the interface for data access operations related to Jobs.
type JobRepository interface {
	// CreateJob adds a new job to the persistence layer.
	CreateJob(ctx context.Context, job *Job) error

	// GetJobByID retrieves a job by its unique identifier.
	GetJobByID(ctx context.Context, jobID string) (*Job, error)

	// ListJobsByProjectID retrieves a list of jobs associated with a specific project.
	// Add filtering/pagination parameters as needed.
	ListJobsByProjectID(ctx context.Context, projectID string, limit, offset int) ([]*Job, int, error) // Returns jobs, total count, error

	// UpdateJobStatus updates the status and potentially timestamps and pipeline ID of a job.
	UpdateJobStatus(ctx context.Context, jobID string, newStatus JobStatus, pipelineJobID string, startedAt, completedAt *time.Time, jobError string) error

	// UpdateJobResult updates the result URI of a completed job.
	UpdateJobResult(ctx context.Context, jobID string, resultURI string) error

	// ListJobsAcrossProjects retrieves jobs from a list of specified project IDs.
	// Supports filtering and pagination across the combined set of projects.
	ListJobsAcrossProjects(ctx context.Context, projectIDs []string, statusFilter string, limit, offset int) ([]*Job, int, error) // Returns jobs, total count, error

	// TODO: Consider adding methods for advanced filtering or deletion if required.
}

// StorageService defines the interface for interacting with object storage.
type StorageService interface {
	// CreateProjectBucket creates a dedicated storage bucket for a project.
	// Returns bucket name and region, or an error.
	CreateProjectBucket(ctx context.Context, projectID, customerID, requestedRegion string) (bucketName string, region string, err error)

	// DeleteProjectBucket removes the storage bucket associated with a project.
	// Force delete should remove contents first if necessary.
	DeleteProjectBucket(ctx context.Context, bucketName string, force bool) error

	// TODO: Add other methods as needed (e.g., SetBucketLifecycle)
}
