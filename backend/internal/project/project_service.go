package project

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"context"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// Define specific errors for project service
var (
	ErrProjectNotFound      = errors.New("project not found")
	ErrProjectAccessDenied  = errors.New("access denied to project")
	ErrBucketCreationFailed = errors.New("failed to create storage bucket")
	ErrBucketDeletionFailed = errors.New("failed to delete storage bucket")
	ErrProjectUpdateFailed  = errors.New("failed to update project")
)

// projectService provides implementations for the ProjectService interface.
type projectService struct {
	projectRepo core.ProjectRepository
	storageSvc  core.StorageService // Dependency for storage operations
	// Add user repo or other dependencies if needed for auth checks
}

// NewProjectService creates a new instance of ProjectService.
func NewProjectService(projectRepo core.ProjectRepository, storageSvc core.StorageService) ProjectService {
	return &projectService{
		projectRepo: projectRepo,
		storageSvc:  storageSvc,
	}
}

// CreateProject handles the logic for creating a new project.
func (s *projectService) CreateProject(ctx context.Context, customerID string, req CreateProjectRequest) (*core.Project, error) {
	now := time.Now().UTC()

	// 1. Prepare core Project struct (without storage initially)
	newProject := &core.Project{
		Name:        req.Name,
		Description: req.Description,
		CustomerID:  customerID,
		Status:      "active", // Default status
		Settings:    req.Settings,
		TeamMembers: []core.TeamMember{ // Add creator as initial owner
			{UserID: customerID, Role: "owner", AddedAt: now},
		},
		CreatedAt: now,
		UpdatedAt: now,
		// Storage details will be filled after bucket creation
	}

	// --- Placeholder Project ID for Bucket Creation ---
	// Ideally, create a draft in DB first, get ID, then create bucket.
	// For simplicity here, we'll create bucket first with a temporary ID.
	// A more robust solution involves transactional steps or compensating actions.
	// Using customerID + name might be prone to collisions if not unique.
	tempProjectIDForBucket := customerID + "-" + req.Name // Consider a better temporary ID

	// 2. Create the storage bucket
	// TODO: Determine region logic (from request? default? config?)
	requestedRegion := "us-central1" // Example
	bucketName, region, err := s.storageSvc.CreateProjectBucket(ctx, tempProjectIDForBucket, customerID, requestedRegion)
	if err != nil {
		logger.Logger.Error("Failed to create project bucket", zap.Error(err), zap.String("customerID", customerID))
		// Decide if we should still create the project doc or fail completely
		return nil, ErrBucketCreationFailed
	}

	// 3. Update project struct with storage details
	newProject.Storage = core.ProjectStorage{
		BucketName: bucketName,
		Region:     region,
	}

	// 4. Save the project to the repository
	projectID, err := s.projectRepo.CreateProject(ctx, newProject)
	if err != nil {
		logger.Logger.Error("Failed to save project after bucket creation", zap.Error(err), zap.String("customerID", customerID))
		// Potential issue: Bucket created but project doc failed. Needs cleanup/compensation logic.
		// Consider deleting the bucket here if project creation fails.
		_ = s.storageSvc.DeleteProjectBucket(context.Background(), bucketName, true) // Best effort cleanup
		return nil, fmt.Errorf("failed to save project: %w", err)
	}
	newProject.ID = projectID

	logger.Logger.Info("Project created successfully", zap.String("projectID", projectID), zap.String("customerID", customerID))
	return newProject, nil
}

// GetProjectByID retrieves a specific project, ensuring the caller has access.
func (s *projectService) GetProjectByID(ctx context.Context, projectID string, callerID string) (*core.Project, error) {
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		logger.Logger.Error("Repository error getting project by ID", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// Authorization Check: Ensure the caller is part of the project team.
	if !s.isUserOnProjectTeam(project, callerID) {
		logger.Logger.Warn("Project access denied", zap.String("projectID", projectID), zap.String("callerID", callerID))
		return nil, ErrProjectAccessDenied
	}

	return project, nil
}

// ListProjects retrieves projects for a specific customer.
func (s *projectService) ListProjects(ctx context.Context, customerID string, statusFilter string, limit, offset int) (*ListProjectsResponse, error) {
	// Validate limit/offset (optional, repo might handle defaults)
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if offset < 0 {
		offset = 0
	}

	projects, err := s.projectRepo.ListProjects(ctx, customerID, statusFilter, limit, offset)
	if err != nil {
		logger.Logger.Error("Repository error listing projects", zap.Error(err), zap.String("customerID", customerID))
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}

	// Get total count for pagination metadata
	total, err := s.projectRepo.CountProjects(ctx, customerID, statusFilter)
	if err != nil {
		logger.Logger.Error("Repository error counting projects", zap.Error(err), zap.String("customerID", customerID))
		// Continue without total count if counting fails?
		// Or return error? Let's return error for now.
		return nil, fmt.Errorf("failed to count projects: %w", err)
	}

	resp := &ListProjectsResponse{
		Projects: projects,
		Total:    total,
		Limit:    limit,
		Offset:   offset,
	}

	return resp, nil
}

// UpdateProject handles updating project details.
func (s *projectService) UpdateProject(ctx context.Context, projectID string, callerID string, req UpdateProjectRequest) (*core.Project, error) {
	// 1. Get the existing project
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		logger.Logger.Error("UpdateProject: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project for update: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// 2. Authorization Check: Ensure caller can update (e.g., owner or admin)
	if !s.canUserManageProject(project, callerID) {
		logger.Logger.Warn("UpdateProject: Access denied", zap.String("projectID", projectID), zap.String("callerID", callerID))
		return nil, ErrProjectAccessDenied
	}

	// 3. Apply updates from the request
	updated := false
	if req.Name != nil && *req.Name != project.Name {
		project.Name = *req.Name
		updated = true
	}
	if req.Description != nil && *req.Description != project.Description {
		project.Description = *req.Description
		updated = true
	}
	if req.Status != nil && *req.Status != project.Status {
		// TODO: Add logic if archiving/unarchiving needs other actions (e.g., disable jobs)
		project.Status = *req.Status
		updated = true
	}
	if req.Settings != nil {
		// TODO: Add more granular update logic if needed
		if req.Settings.DataRetentionDays != project.Settings.DataRetentionDays || req.Settings.MaxStorageGB != project.Settings.MaxStorageGB {
			project.Settings = *req.Settings
			updated = true
			// TODO: Potentially update bucket lifecycle policy if retention changes
		}
	}

	// 4. If changes were made, update timestamp and save
	if updated {
		project.UpdatedAt = time.Now().UTC()
		err = s.projectRepo.UpdateProject(ctx, project)
		if err != nil {
			logger.Logger.Error("UpdateProject: Failed to save updates", zap.Error(err), zap.String("projectID", projectID))
			return nil, ErrProjectUpdateFailed
		}
	}

	return project, nil
}

// DeleteProject handles deleting (or archiving) a project.
func (s *projectService) DeleteProject(ctx context.Context, projectID string, callerID string) error {
	// 1. Get the existing project
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		logger.Logger.Error("DeleteProject: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return fmt.Errorf("failed to retrieve project for deletion: %w", err)
	}
	if project == nil {
		return ErrProjectNotFound // Or return nil if deleting non-existent is ok
	}

	// 2. Authorization Check: Ensure caller can delete (e.g., owner)
	if !s.canUserDeleteProject(project, callerID) {
		logger.Logger.Warn("DeleteProject: Access denied", zap.String("projectID", projectID), zap.String("callerID", callerID))
		return ErrProjectAccessDenied
	}

	// 3. Delete associated storage bucket (handle potential errors)
	if project.Storage.BucketName != "" {
		err = s.storageSvc.DeleteProjectBucket(ctx, project.Storage.BucketName, true) // Force delete contents
		if err != nil {
			logger.Logger.Error("DeleteProject: Failed to delete storage bucket", zap.Error(err), zap.String("projectID", projectID), zap.String("bucketName", project.Storage.BucketName))
			// Decide if we should still delete the project doc or return error
			return ErrBucketDeletionFailed // Return error for now
		}
	}

	// 4. Delete the project document from repository
	err = s.projectRepo.DeleteProject(ctx, projectID)
	if err != nil {
		logger.Logger.Error("DeleteProject: Failed to delete project document", zap.Error(err), zap.String("projectID", projectID))
		return fmt.Errorf("failed to delete project document: %w", err)
	}

	logger.Logger.Info("Project deleted successfully", zap.String("projectID", projectID))
	return nil
}

// --- Authorization Helper Methods ---

// isUserOnProjectTeam checks if a user ID is part of the project's team members.
func (s *projectService) isUserOnProjectTeam(project *core.Project, userID string) bool {
	for _, member := range project.TeamMembers {
		if member.UserID == userID {
			return true
		}
	}
	return false
}

// canUserManageProject checks if a user has permission to update project settings (e.g., owner or admin).
func (s *projectService) canUserManageProject(project *core.Project, userID string) bool {
	for _, member := range project.TeamMembers {
		if member.UserID == userID && (member.Role == "owner" || member.Role == "admin") {
			return true
		}
	}
	return false
}

// canUserDeleteProject checks if a user has permission to delete a project (e.g., owner).
func (s *projectService) canUserDeleteProject(project *core.Project, userID string) bool {
	for _, member := range project.TeamMembers {
		if member.UserID == userID && member.Role == "owner" {
			return true
		}
	}
	return false
}
