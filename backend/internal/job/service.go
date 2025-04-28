package job

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"SynDataGen/backend/internal/project" // Import project service
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// --- Service Interface ---

// JobService defines the interface for job-related business logic.
type JobService interface {
	// CreateJob validates and creates a new job record, requiring Member role.
	CreateJob(ctx context.Context, projectID, userID string, req CreateJobRequest) (*core.Job, error)

	// SubmitJob submits a previously created job to the external pipeline, requiring Member role.
	SubmitJob(ctx context.Context, jobID, userID string) (*core.Job, error)

	// GetJobByID retrieves a specific job by its ID, requiring Viewer role.
	GetJobByID(ctx context.Context, jobID, userID string) (*core.Job, error)

	// ListJobsByProject retrieves a paginated list of jobs for a given project, requiring Viewer role.
	ListJobsByProject(ctx context.Context, projectID, userID string, limit, offset int) ([]*core.Job, int, error)

	// CancelJob requests cancellation of a job, requiring Member role.
	CancelJob(ctx context.Context, jobID, userID string) (*core.Job, error)

	// SyncJobStatus checks pipeline status, requiring Viewer role.
	SyncJobStatus(ctx context.Context, jobID, userID string) (*core.Job, error)

	// ListAllAccessibleJobs retrieves jobs across all projects accessible to the user.
	ListAllAccessibleJobs(ctx context.Context, userID string, statusFilter string, limit, offset int) ([]*core.Job, int, error)

	// TODO: Add methods for deleting jobs or accessing results if needed in the service layer.
}

// jobService implements the JobService interface.
type jobService struct {
	jobRepo    core.JobRepository
	projectSvc project.ProjectService // Use ProjectService for auth checks
	pipeline   PipelineClient         // Interface for the external pipeline
	// logger      *log.Logger // Using global logger now
}

// NewJobService creates a new job service instance.
func NewJobService(
	jobRepo core.JobRepository,
	projectSvc project.ProjectService, // Inject ProjectService
	pipeline PipelineClient,
) JobService {
	// Removed logger injection, using global logger
	return &jobService{
		jobRepo:    jobRepo,
		projectSvc: projectSvc,
		pipeline:   pipeline,
	}
}

// authorizeJobAction checks if the user has the required role for the job's project.
// It leverages the injected ProjectService, which handles the actual RBAC logic.
func (s *jobService) authorizeJobAction(ctx context.Context, projectID, userID string, requiredRole core.Role) error {
	// Use ProjectService GetProjectByID - it implicitly performs the auth check based on its internal logic
	// We just need to ensure the user has *at least* the requiredRole.
	// ProjectService's GetProjectByID requires RoleViewer by default.
	// For higher roles, we call GetProjectByID first to ensure basic access and existence,
	// then check the role from the returned project struct.
	proj, err := s.projectSvc.GetProjectByID(ctx, projectID, userID)
	if err != nil {
		// Handles ErrProjectNotFound and ErrProjectAccessDenied from the project service
		logger.Logger.Warn("Authorization failed during project retrieval",
			zap.String("projectID", projectID),
			zap.String("userID", userID),
			zap.String("requiredRole", string(requiredRole)),
			zap.Error(err),
		)
		return fmt.Errorf("project access check failed: %w", err) // Return the underlying error (NotFound or AccessDenied)
	}

	// Now check if the user's role meets the specific requirement for this job action
	userRole, exists := proj.TeamMembers[userID]
	if !exists {
		// This shouldn't happen if GetProjectByID succeeded, but double-check
		logger.Logger.Error("Authorization inconsistency: User not found in team members after successful GetProjectByID",
			zap.String("projectID", projectID),
			zap.String("userID", userID),
		)
		return core.ErrForbidden // Or a more specific internal error
	}

	// Define role hierarchy (could be moved to core or a shared helper)
	roleHierarchy := map[core.Role]int{
		core.RoleViewer: 1,
		core.RoleMember: 2,
		core.RoleAdmin:  3,
		core.RoleOwner:  4,
	}

	userLevel, okUser := roleHierarchy[userRole]
	requiredLevel, okRequired := roleHierarchy[requiredRole]

	if !(okUser && okRequired && userLevel >= requiredLevel) {
		logger.Logger.Warn("Authorization failed: Insufficient role for job action",
			zap.String("projectID", projectID),
			zap.String("userID", userID),
			zap.String("userRole", string(userRole)),
			zap.String("requiredRole", string(requiredRole)),
		)
		return core.ErrForbidden
	}

	logger.Logger.Debug("Authorization successful for job action",
		zap.String("projectID", projectID),
		zap.String("userID", userID),
		zap.String("requiredRole", string(requiredRole)),
	)
	return nil // Authorized
}

// CreateJob validates and creates a new job record, requiring Member role.
func (s *jobService) CreateJob(ctx context.Context, projectID, userID string, req CreateJobRequest) (*core.Job, error) {
	logger.Logger.Info("Attempting to create job",
		zap.String("projectID", projectID),
		zap.String("userID", userID),
		zap.String("jobType", req.JobType),
	)
	// 1. Check Permissions (Requires Member role)
	if err := s.authorizeJobAction(ctx, projectID, userID, core.RoleMember); err != nil {
		return nil, err // Error logged in helper
	}

	// 2. Validate Inputs
	if req.JobType == "" {
		return nil, fmt.Errorf("job type cannot be empty")
	}
	if req.JobConfig == "" { // TODO: Add richer config validation
		return nil, fmt.Errorf("job configuration cannot be empty")
	}

	// 3. Create Job Struct
	now := time.Now().UTC()
	newJob := &core.Job{
		ID:            uuid.NewString(), // Generate unique ID
		ProjectID:     projectID,
		UserID:        userID,                // User who created the job
		Status:        core.JobStatusPending, // Initial status before submission
		JobType:       req.JobType,
		JobConfig:     req.JobConfig,
		CreatedAt:     now,
		UpdatedAt:     now,
		ResultURI:     "", // No result initially
		PipelineJobID: "", // No pipeline ID initially
	}

	// 4. Persist to Repository
	if err := s.jobRepo.CreateJob(ctx, newJob); err != nil {
		// Error logged by repository
		return nil, fmt.Errorf("failed to store new job: %w", err)
	}

	logger.Logger.Info("Successfully created job",
		zap.String("jobID", newJob.ID),
		zap.String("projectID", projectID),
	)
	return newJob, nil
}

// SubmitJob submits a job to the pipeline, requiring Member role.
func (s *jobService) SubmitJob(ctx context.Context, jobID, userID string) (*core.Job, error) {
	logger.Logger.Info("Attempting to submit job", zap.String("jobID", jobID), zap.String("userID", userID))
	// 1. Get Job
	job, err := s.jobRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return nil, fmt.Errorf("failed to get job %s for submission: %w", jobID, err)
	}

	// 2. Check Permissions (Requires Member role for the job's project)
	if err := s.authorizeJobAction(ctx, job.ProjectID, userID, core.RoleMember); err != nil {
		return nil, err // Error logged in helper
	}

	// 3. Check if Submittable (must be Pending)
	if job.Status != core.JobStatusPending {
		logger.Logger.Warn("Cannot submit job, status is not pending",
			zap.String("jobID", jobID),
			zap.String("status", string(job.Status)),
		)
		return nil, fmt.Errorf("job %s cannot be submitted, status is %s", jobID, job.Status)
	}

	// 4. Submit to Pipeline Client
	pipelineJobID, err := s.pipeline.Submit(ctx, job.JobConfig, job.JobType, job.ProjectID)
	if err != nil {
		// Pipeline client should log specifics. Update job status to Failed.
		errMsg := fmt.Sprintf("Pipeline submission failed: %v", err)
		logger.Logger.Error("Pipeline submission failed, marking job as failed",
			zap.String("jobID", jobID),
			zap.Error(err),
		)
		updateErr := s.jobRepo.UpdateJobStatus(ctx, jobID, core.JobStatusFailed, "", nil, nil, errMsg)
		if updateErr != nil {
			logger.Logger.Error("CRITICAL: Failed to update job status to Failed after pipeline error",
				zap.String("jobID", jobID),
				zap.NamedError("updateError", updateErr),
				zap.NamedError("pipelineError", err),
			)
			// Return original pipeline error, but log the secondary failure
			return nil, fmt.Errorf("pipeline submission failed: %w (and failed to update status)", err)
		}
		job.Status = core.JobStatusFailed // Update local struct for return
		job.Error = errMsg
		return job, fmt.Errorf("pipeline submission failed: %w", err) // Return original pipeline error
	}
	logger.Logger.Info("Job submitted to pipeline",
		zap.String("jobID", jobID),
		zap.String("pipelineJobID", pipelineJobID),
	)

	// 5. Update Job Status & Pipeline ID in Repository
	now := time.Now().UTC()
	statusToSet := core.JobStatusRunning // Assume Running
	err = s.jobRepo.UpdateJobStatus(ctx, jobID, statusToSet, pipelineJobID, &now, nil, "")
	if err != nil {
		logger.Logger.Error("CRITICAL: Pipeline accepted job but failed to update local status",
			zap.String("jobID", jobID),
			zap.String("pipelineJobID", pipelineJobID),
			zap.String("targetStatus", string(statusToSet)),
			zap.Error(err),
		)
		// Return the job struct with the *old* status, but indicate failure
		return job, fmt.Errorf("job submitted to pipeline (ID: %s) but failed to update local status: %w", pipelineJobID, err)
	}

	// Update local struct for return
	job.Status = statusToSet
	job.PipelineJobID = pipelineJobID
	job.StartedAt = &now
	job.UpdatedAt = now // Reflect update time
	logger.Logger.Info("Successfully submitted job, status updated",
		zap.String("jobID", jobID),
		zap.String("newStatus", string(statusToSet)),
	)

	return job, nil
}

// GetJobByID retrieves a job, requiring Viewer role.
func (s *jobService) GetJobByID(ctx context.Context, jobID, userID string) (*core.Job, error) {
	logger.Logger.Debug("Attempting to get job", zap.String("jobID", jobID), zap.String("userID", userID))
	job, err := s.jobRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return nil, err // Error logged by repo
	}

	// Check permissions (Requires Viewer role for the job's project)
	if err := s.authorizeJobAction(ctx, job.ProjectID, userID, core.RoleViewer); err != nil {
		return nil, err // Error logged by helper
	}

	logger.Logger.Debug("Successfully retrieved job", zap.String("jobID", jobID))
	return job, nil
}

// ListJobsByProject retrieves jobs for a project, requiring Viewer role.
func (s *jobService) ListJobsByProject(ctx context.Context, projectID, userID string, limit, offset int) ([]*core.Job, int, error) {
	logger.Logger.Debug("Attempting to list jobs", zap.String("projectID", projectID), zap.String("userID", userID))
	// Check permissions (Requires Viewer role for the project)
	if err := s.authorizeJobAction(ctx, projectID, userID, core.RoleViewer); err != nil {
		return nil, 0, err // Error logged by helper
	}

	jobs, totalCount, err := s.jobRepo.ListJobsByProjectID(ctx, projectID, limit, offset)
	if err != nil {
		return nil, 0, err // Error logged by repo
	}

	logger.Logger.Debug("Successfully listed jobs",
		zap.String("projectID", projectID),
		zap.Int("count", len(jobs)),
		zap.Int("total", totalCount),
	)
	return jobs, totalCount, nil
}

// CancelJob requests cancellation of a job, requiring Member role.
func (s *jobService) CancelJob(ctx context.Context, jobID, userID string) (*core.Job, error) {
	logger.Logger.Info("Attempting to cancel job", zap.String("jobID", jobID), zap.String("userID", userID))
	// 1. Get Job
	job, err := s.jobRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return nil, fmt.Errorf("failed to get job %s for cancellation: %w", jobID, err)
	}

	// 2. Check Permissions (Requires Member role for the job's project)
	if err := s.authorizeJobAction(ctx, job.ProjectID, userID, core.RoleMember); err != nil {
		return nil, err // Error logged by helper
	}

	// 3. Check if Cancellable (Pending, Running)
	if job.Status != core.JobStatusPending && job.Status != core.JobStatusRunning {
		logger.Logger.Warn("Cannot cancel job, status is not cancellable",
			zap.String("jobID", jobID),
			zap.String("status", string(job.Status)),
		)
		return nil, fmt.Errorf("job %s cannot be cancelled, status is %s", jobID, job.Status)
	}

	// 4. Get Pipeline ID (if submitted)
	pipelineJobID := job.PipelineJobID
	cancelMsg := "Cancelled by user before submission"
	statusToSet := core.JobStatusCancelled

	if pipelineJobID != "" {
		// 5. Send Cancel Request to Pipeline if it was submitted
		err = s.pipeline.Cancel(ctx, pipelineJobID)
		if err != nil {
			// Log the error, but proceed to mark as cancelled locally anyway?
			// Policy: Mark as cancelled locally even if pipeline cancel fails, but log error.
			cancelMsg = fmt.Sprintf("Cancelled by user; pipeline cancellation failed: %v", err)
			logger.Logger.Error("Pipeline cancellation request failed, but marking job as cancelled locally",
				zap.String("jobID", jobID),
				zap.String("pipelineJobID", pipelineJobID),
				zap.Error(err),
			)
			// Keep statusToSet as Cancelled
		} else {
			cancelMsg = "Cancelled by user via pipeline request"
			logger.Logger.Info("Cancellation request sent successfully to pipeline",
				zap.String("jobID", jobID),
				zap.String("pipelineJobID", pipelineJobID),
			)
		}
	}

	// 6. Update Job Status Locally
	now := time.Now().UTC()
	err = s.jobRepo.UpdateJobStatus(ctx, jobID, statusToSet, pipelineJobID, job.StartedAt, &now, cancelMsg)
	if err != nil {
		logger.Logger.Error("CRITICAL: Failed to update local status after cancellation request",
			zap.String("jobID", jobID),
			zap.Error(err),
		)
		// Return job with old status but indicate error
		return job, fmt.Errorf("job cancellation requested but failed to update local status: %w", err)
	}

	// Update local struct
	job.Status = statusToSet
	job.CompletedAt = &now
	job.Error = cancelMsg
	job.UpdatedAt = now
	logger.Logger.Info("Successfully marked job as cancelled locally.", zap.String("jobID", jobID))

	return job, nil
}

// SyncJobStatus checks pipeline status, requiring Viewer role.
func (s *jobService) SyncJobStatus(ctx context.Context, jobID, userID string) (*core.Job, error) {
	logger.Logger.Debug("Attempting to sync status for job", zap.String("jobID", jobID), zap.String("userID", userID))
	// 1. Get Job
	job, err := s.jobRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return nil, fmt.Errorf("failed to get job %s for status sync: %w", jobID, err)
	}

	// 2. Check Permissions (Requires Viewer role for the job's project)
	if err := s.authorizeJobAction(ctx, job.ProjectID, userID, core.RoleViewer); err != nil {
		return nil, err // Error logged by helper
	}

	// 3. Check if job is in a final state already
	if job.Status == core.JobStatusCompleted || job.Status == core.JobStatusFailed || job.Status == core.JobStatusCancelled {
		logger.Logger.Debug("Skipping status sync, job already in final state",
			zap.String("jobID", jobID),
			zap.String("status", string(job.Status)),
		)
		return job, nil // No need to sync
	}

	// 4. Get Pipeline ID
	pipelineJobID := job.PipelineJobID
	if pipelineJobID == "" {
		// This can happen if the job is still Pending and hasn't been submitted
		logger.Logger.Debug("Skipping status sync, job has no pipeline ID (likely pending)", zap.String("jobID", jobID))
		return job, nil // No pipeline ID to check
	}

	// 5. Check Status with Pipeline Client
	newStatus, pipelineError, err := s.pipeline.CheckStatus(ctx, pipelineJobID)
	if err != nil {
		logger.Logger.Warn("Error checking pipeline status",
			zap.String("jobID", jobID),
			zap.String("pipelineJobID", pipelineJobID),
			zap.Error(err),
		)
		// Don't fail the job locally unless the pipeline confirms failure.
		// Return the current job state and the error from the check.
		return job, fmt.Errorf("failed to check pipeline status for job %s: %w", jobID, err)
	}
	logger.Logger.Debug("Pipeline status check returned",
		zap.String("jobID", jobID),
		zap.String("pipelineJobID", pipelineJobID),
		zap.String("pipelineStatus", string(newStatus)),
	)

	// 6. Update Local Status if Changed
	if newStatus != job.Status {
		logger.Logger.Info("Status change detected, updating local record",
			zap.String("jobID", jobID),
			zap.String("oldStatus", string(job.Status)),
			zap.String("newStatus", string(newStatus)),
		)
		var completedAt *time.Time
		now := time.Now().UTC()
		if newStatus == core.JobStatusCompleted || newStatus == core.JobStatusFailed || newStatus == core.JobStatusCancelled {
			completedAt = &now
		}
		err = s.jobRepo.UpdateJobStatus(ctx, jobID, newStatus, pipelineJobID, job.StartedAt, completedAt, pipelineError)
		if err != nil {
			logger.Logger.Error("CRITICAL: Failed to update local status after pipeline sync",
				zap.String("jobID", jobID),
				zap.Error(err),
			)
			return job, fmt.Errorf("failed to update local status for job %s after sync: %w", jobID, err)
		}
		// Update local struct
		job.Status = newStatus
		job.CompletedAt = completedAt
		job.Error = pipelineError
		job.UpdatedAt = now
	} else {
		logger.Logger.Debug("No status change detected.", zap.String("jobID", jobID))
		// Optionally update UpdatedAt even if status didn't change, to show sync happened?
		// job.UpdatedAt = time.Now().UTC()
		// err = s.jobRepo.UpdateJob(ctx, job) // Need an UpdateJob method if doing this
	}

	// TODO: Potentially fetch result URI if status is Completed
	// if newStatus == core.JobStatusCompleted { ... fetch and update result URI ... }

	return job, nil
}

// ListAllAccessibleJobs retrieves jobs across all projects the user can view.
func (s *jobService) ListAllAccessibleJobs(ctx context.Context, userID string, statusFilter string, limit, offset int) ([]*core.Job, int, error) {
	logger.Logger.Info("Listing all accessible jobs for user", zap.String("userID", userID))

	// 1. Get all projects accessible to the user (Viewer level is sufficient to list jobs)
	// We don't need pagination here, just the list of projects.
	// Assuming ListProjects handles the permission check internally.
	// We might need a dedicated projectService method like GetAllAccessibleProjectIDs if ListProjects requires pagination.
	// For now, fetch all projects with a high limit (or iterate through pages if necessary).
	accessibleProjectsResp, err := s.projectSvc.ListProjects(ctx, userID, "", 1000, 0) // High limit to get all projects
	if err != nil {
		logger.Logger.Error("Failed to list projects to determine accessible jobs", zap.String("userID", userID), zap.Error(err))
		// Don't expose internal error details directly
		return nil, 0, fmt.Errorf("failed to determine accessible projects")
	}

	if accessibleProjectsResp == nil || len(accessibleProjectsResp.Projects) == 0 {
		logger.Logger.Info("User has no accessible projects", zap.String("userID", userID))
		return []*core.Job{}, 0, nil // No projects, so no jobs
	}

	// 2. Extract project IDs
	projectIDs := make([]string, 0, len(accessibleProjectsResp.Projects))
	for _, proj := range accessibleProjectsResp.Projects {
		projectIDs = append(projectIDs, proj.ID)
	}

	// 3. Call the repository method to get jobs across these projects
	jobs, totalCount, err := s.jobRepo.ListJobsAcrossProjects(ctx, projectIDs, statusFilter, limit, offset)
	if err != nil {
		// Logged by repository
		return nil, 0, fmt.Errorf("failed to list jobs across projects: %w", err)
	}

	logger.Logger.Info("Successfully listed all accessible jobs", zap.String("userID", userID), zap.Int("count", len(jobs)), zap.Int("total", totalCount))
	return jobs, totalCount, nil
}
