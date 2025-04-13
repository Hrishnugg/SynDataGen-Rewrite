package job

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// jobService implements the JobService interface.
type jobService struct {
	jobRepo     core.JobRepository
	projectRepo core.ProjectRepository // Added Project Repo for permission checks for now
	// projectSvc project.ProjectService // Alternatively, inject ProjectService
	// storageSvc core.StorageService // Inject if needed for result URIs later
}

// NewJobService creates a new job service instance.
func NewJobService(jobRepo core.JobRepository, projectRepo core.ProjectRepository) JobService {
	return &jobService{
		jobRepo:     jobRepo,
		projectRepo: projectRepo,
	}
}

// CreateJob implements the logic for creating a new job.
func (s *jobService) CreateJob(ctx context.Context, userID string, req CreateJobRequest) (*core.Job, error) {
	logger.Logger.Info("Attempting to create job",
		zap.String("userId", userID),
		zap.String("projectId", req.ProjectID),
		zap.String("jobType", req.JobType),
	)

	// --- Authorization Check ---
	// Verify the project exists and the user has permission to create jobs in it.
	// This logic might be complex (checking team membership, roles, etc.)
	// For simplicity now, just check if the project exists and if the user is associated (e.g., creator or member).
	// TODO: Implement robust permission checking, potentially via ProjectService.
	proj, err := s.projectRepo.GetProjectByID(ctx, req.ProjectID)
	if err != nil {
		if err == core.ErrNotFound {
			logger.Logger.Warn("Project not found during job creation", zap.String("projectId", req.ProjectID))
			return nil, fmt.Errorf("project not found: %w", err)
		}
		logger.Logger.Error("Failed to get project during job creation", zap.Error(err), zap.String("projectId", req.ProjectID))
		return nil, fmt.Errorf("failed to verify project access: %w", err)
	}

	// Basic check: Is the user the owner or a team member?
	isMember := false
	if proj.CustomerID == userID {
		isMember = true
	}
	// TODO: Iterate through proj.TeamMembers when implemented
	// for _, member := range proj.TeamMembers {
	// 	if member.UserID == userID {
	// 		isMember = true
	// 		break
	// 	}
	// }

	if !isMember {
		logger.Logger.Warn("User forbidden from creating job in project", zap.String("userId", userID), zap.String("projectId", req.ProjectID))
		return nil, core.ErrForbidden // Assuming ErrForbidden is defined in core
	}
	logger.Logger.Debug("User authorized to create job in project", zap.String("userId", userID), zap.String("projectId", req.ProjectID))

	// --- Create Job Record ---
	newJob := &core.Job{
		ID:        uuid.NewString(), // Generate unique ID
		ProjectID: req.ProjectID,
		UserID:    userID,
		Status:    core.JobStatusPending,
		JobType:   req.JobType,
		JobConfig: req.JobConfig,
		CreatedAt: time.Now().UTC(),
	}

	err = s.jobRepo.CreateJob(ctx, newJob)
	if err != nil {
		logger.Logger.Error("Failed to create job in repository", zap.Error(err), zap.Any("job", newJob))
		return nil, fmt.Errorf("failed to save job: %w", err)
	}

	logger.Logger.Info("Successfully created job record", zap.String("jobId", newJob.ID), zap.String("projectId", newJob.ProjectID))

	// --- Trigger Asynchronous Job Execution (Placeholder) ---
	// TODO: Add logic here to trigger the actual data generation.
	// This could involve:
	// - Sending a message to a Pub/Sub topic
	// - Adding the job ID to a work queue (e.g., Redis list)
	// - Starting a background goroutine (simpler, but less robust)
	// For now, we just return the created job record.
	logger.Logger.Info("Placeholder: Job execution trigger would happen here", zap.String("jobId", newJob.ID))

	return newJob, nil
}

// GetJobByID implements the logic for retrieving a job by its ID.
func (s *jobService) GetJobByID(ctx context.Context, jobID string, callerID string) (*core.Job, error) {
	logger.Logger.Debug("Attempting to get job by ID", zap.String("jobId", jobID), zap.String("callerId", callerID))
	job, err := s.jobRepo.GetJobByID(ctx, jobID)
	if err != nil {
		if err == core.ErrNotFound {
			logger.Logger.Warn("Job not found", zap.String("jobId", jobID))
			return nil, core.ErrNotFound
		}
		logger.Logger.Error("Failed to get job from repository", zap.Error(err), zap.String("jobId", jobID))
		return nil, fmt.Errorf("failed to retrieve job: %w", err)
	}

	// --- Authorization Check ---
	// Check if the caller has permission to view this job (must be part of the same project)
	// TODO: Implement robust permission checking, potentially via ProjectService.
	proj, err := s.projectRepo.GetProjectByID(ctx, job.ProjectID)
	if err != nil {
		// If project fetch fails after job fetch, something is inconsistent
		logger.Logger.Error("Failed to get project associated with job", zap.Error(err), zap.String("projectId", job.ProjectID), zap.String("jobId", job.ID))
		return nil, fmt.Errorf("failed to verify project access for job: %w", err)
	}

	// Basic check: Is the user the owner or a team member?
	isMember := false
	if proj.CustomerID == callerID {
		isMember = true
	}
	// TODO: Iterate through proj.TeamMembers

	if !isMember {
		logger.Logger.Warn("User forbidden from viewing job", zap.String("callerId", callerID), zap.String("jobId", jobID), zap.String("projectId", job.ProjectID))
		return nil, core.ErrForbidden
	}

	logger.Logger.Debug("Successfully retrieved and authorized job", zap.String("jobId", jobID))
	return job, nil
}

// ListJobsByProjectID implements the logic for listing jobs within a project.
func (s *jobService) ListJobsByProjectID(ctx context.Context, projectID string, callerID string, limit, offset int) (*ListJobsResponse, error) {
	logger.Logger.Debug("Attempting to list jobs for project", zap.String("projectId", projectID), zap.String("callerId", callerID))

	// --- Authorization Check ---
	// Check if the caller has permission to view this project
	// TODO: Implement robust permission checking, potentially via ProjectService.
	proj, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		if err == core.ErrNotFound {
			logger.Logger.Warn("Project not found during job list", zap.String("projectId", projectID))
			return nil, core.ErrNotFound // Project itself not found
		}
		logger.Logger.Error("Failed to get project during job list", zap.Error(err), zap.String("projectId", projectID))
		return nil, fmt.Errorf("failed to verify project access for listing jobs: %w", err)
	}

	// Basic check: Is the user the owner or a team member?
	isMember := false
	if proj.CustomerID == callerID {
		isMember = true
	}
	// TODO: Iterate through proj.TeamMembers

	if !isMember {
		logger.Logger.Warn("User forbidden from listing jobs in project", zap.String("callerId", callerID), zap.String("projectId", projectID))
		return nil, core.ErrForbidden
	}

	// --- Retrieve Jobs ---
	jobs, total, err := s.jobRepo.ListJobsByProjectID(ctx, projectID, limit, offset)
	if err != nil {
		logger.Logger.Error("Failed to list jobs from repository", zap.Error(err), zap.String("projectId", projectID))
		return nil, fmt.Errorf("failed to retrieve jobs list: %w", err)
	}

	// Ensure jobs slice is not nil for JSON marshalling
	if jobs == nil {
		jobs = []*core.Job{}
	}

	resp := &ListJobsResponse{
		Jobs:   jobs,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}

	logger.Logger.Debug("Successfully listed jobs for project", zap.String("projectId", projectID), zap.Int("count", len(jobs)), zap.Int("total", total))
	return resp, nil
}
