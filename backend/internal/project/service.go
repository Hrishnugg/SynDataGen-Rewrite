package project

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger" // Using platform logger
	"context"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// --- Data Transfer Objects (DTOs) ---

// CreateProjectRequest mirrors the request body for creating a project.
type CreateProjectRequest struct {
	Name        string               `json:"name" binding:"required"`
	Description string               `json:"description" binding:"required"`
	Settings    core.ProjectSettings `json:"settings" binding:"required"`
	// Region string? // Could add region preference here
}

// UpdateProjectRequest mirrors the request body for updating a project.
type UpdateProjectRequest struct {
	Name        *string               `json:"name,omitempty"` // Use pointers for optional fields
	Description *string               `json:"description,omitempty"`
	Settings    *core.ProjectSettings `json:"settings,omitempty"`
	Status      *string               `json:"status,omitempty" binding:"omitempty,oneof=active archived"` // Validate status if provided
}

// ListProjectsResponse defines the structure for the list projects endpoint.
type ListProjectsResponse struct {
	Projects []*core.Project `json:"projects"`
	Total    int             `json:"total"`
	Limit    int             `json:"limit"`
	Offset   int             `json:"offset"`
}

// UpdateMemberRoleRequest defines the body for changing a team member's role.
type UpdateMemberRoleRequest struct {
	Role core.Role `json:"role" binding:"required,oneof=admin member viewer"` // Owner role cannot be assigned this way
}

// InviteMemberRequest defines the body for adding a user to a project team.
type InviteMemberRequest struct {
	UserID string    `json:"userId" binding:"required"`
	Role   core.Role `json:"role" binding:"required,oneof=admin member viewer"` // Can only invite as admin, member, or viewer
}

// --- Service Interface ---

// ProjectService defines the interface for project-related business logic.
type ProjectService interface {
	// CreateProject handles the logic for creating a new project, including setting up storage.
	// It takes the creator's user ID.
	CreateProject(ctx context.Context, creatorID string, req CreateProjectRequest) (*core.Project, error)

	// GetProjectByID retrieves a specific project, ensuring the caller has access.
	GetProjectByID(ctx context.Context, projectID string, callerID string) (*core.Project, error)

	// ListProjects retrieves projects where the specified user is a team member.
	ListProjects(ctx context.Context, userID string, statusFilter string, limit, offset int) (*ListProjectsResponse, error)

	// UpdateProject handles updating project details.
	// Requires projectID and the ID of the user making the request for authorization checks.
	UpdateProject(ctx context.Context, projectID string, callerID string, req UpdateProjectRequest) (*core.Project, error)

	// DeleteProject handles deleting (or archiving) a project.
	// Requires projectID and the ID of the user making the request for authorization checks.
	DeleteProject(ctx context.Context, projectID string, callerID string) error

	// UpdateMemberRole changes the role of a target user within a project.
	// Requires caller to be Admin or Owner.
	UpdateMemberRole(ctx context.Context, projectID string, callerID string, targetUserID string, newRole core.Role) (*core.Project, error)

	// RemoveMember removes a target user from a project's team.
	// Requires caller to be Admin or Owner, or the target user removing themselves.
	RemoveMember(ctx context.Context, projectID string, callerID string, targetUserID string) (*core.Project, error)

	// InviteMember adds a registered user to the project team with a specified role.
	// Requires caller to be Admin or Owner.
	InviteMember(ctx context.Context, projectID string, callerID string, req InviteMemberRequest) (*core.Project, error)

	// TODO: Add methods for managing team members (Invite, Remove, UpdateRole)
}

// --- Service Implementation ---

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
	userRepo    core.UserRepository
	storageSvc  core.StorageService
}

// NewProjectService creates a new instance of ProjectService.
func NewProjectService(projectRepo core.ProjectRepository, userRepo core.UserRepository, storageSvc core.StorageService) ProjectService {
	// Ensure dependencies are not nil (optional but good practice)
	if projectRepo == nil {
		panic("ProjectRepository cannot be nil for ProjectService")
	}
	if userRepo == nil {
		panic("UserRepository cannot be nil for ProjectService")
	}
	if storageSvc == nil {
		panic("StorageService cannot be nil for ProjectService")
	}
	return &projectService{
		projectRepo: projectRepo,
		userRepo:    userRepo,
		storageSvc:  storageSvc,
	}
}

// CreateProject handles the logic for creating a new project.
func (s *projectService) CreateProject(ctx context.Context, creatorID string, req CreateProjectRequest) (*core.Project, error) {
	now := time.Now().UTC()

	// 1. Prepare core Project struct
	newProject := &core.Project{
		Name:        req.Name,
		Description: req.Description,
		// CustomerID:  creatorID, // Deprecating direct CustomerID field in favor of TeamMembers owner
		Settings: req.Settings,
		// Initialize TeamMembers map with creator as owner
		TeamMembers: map[string]core.Role{
			creatorID: core.RoleOwner,
		},
		Status:    "active", // Default status
		CreatedAt: now,
		UpdatedAt: now,
		// Storage field is zero-valued initially
	}

	// 2. Save the initial project document to get an ID
	projectID, err := s.projectRepo.CreateProject(ctx, newProject)
	if err != nil {
		logger.Logger.Error("Failed to save initial project document", zap.Error(err), zap.String("creatorID", creatorID))
		return nil, fmt.Errorf("failed to save project: %w", err)
	}
	newProject.ID = projectID // Assign the generated ID
	logger.Logger.Info("Initial project document created", zap.String("projectID", projectID))

	// 3. Create the storage bucket using the generated project ID
	// Pass creatorID as the identifier for bucket labeling/ownership if needed by storage service
	requestedRegion := "" // Let storage service use default
	bucketName, region, err := s.storageSvc.CreateProjectBucket(ctx, newProject.ID, creatorID, requestedRegion)
	if err != nil {
		logger.Logger.Error("Failed to create project bucket after initial save", zap.Error(err), zap.String("projectID", newProject.ID))
		// Attempt compensation: Delete the project document
		logger.Logger.Warn("Attempting compensation: Deleting project document due to bucket creation failure", zap.String("projectID", newProject.ID))
		_ = s.projectRepo.DeleteProject(context.Background(), newProject.ID) // Use background context for cleanup
		return nil, ErrBucketCreationFailed
	}
	logger.Logger.Info("GCS bucket created", zap.String("bucketName", bucketName), zap.String("projectID", projectID))

	// 4. Update project struct with storage details
	newProject.Storage = core.ProjectStorage{
		BucketName: bucketName,
		Region:     region,
		BucketURI:  fmt.Sprintf("gs://%s", bucketName), // Construct the URI
	}

	// 5. Update the project in the repository with storage details
	newProject.UpdatedAt = time.Now().UTC() // Update timestamp
	err = s.projectRepo.UpdateProject(ctx, newProject)
	if err != nil {
		logger.Logger.Error("Failed to update project with storage details after bucket creation", zap.Error(err), zap.String("projectID", newProject.ID))
		// Attempt compensation: Delete the bucket and the project document
		logger.Logger.Warn("Attempting compensation: Deleting bucket and project document due to update failure", zap.String("projectID", newProject.ID), zap.String("bucketName", bucketName))
		_ = s.storageSvc.DeleteProjectBucket(context.Background(), bucketName, true)
		_ = s.projectRepo.DeleteProject(context.Background(), newProject.ID)
		return nil, fmt.Errorf("failed to update project with storage details: %w", err)
	}

	logger.Logger.Info("Project created and storage details updated successfully", zap.String("projectID", projectID))
	return newProject, nil
}

// GetProjectByID retrieves a specific project, ensuring the caller has access.
func (s *projectService) GetProjectByID(ctx context.Context, projectID string, callerID string) (*core.Project, error) {
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		// Assuming GetProjectByID returns nil, nil for not found based on repo impl
		if project == nil && err == nil {
			return nil, ErrProjectNotFound
		}
		// Handle other potential repo errors (e.g., decoding)
		logger.Logger.Error("Repository error getting project by ID", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project: %w", err)
	}
	if project == nil { // Explicit check if repo returned nil, nil
		return nil, ErrProjectNotFound
	}

	// Authorization Check: User must be at least a viewer
	if !s.checkProjectAccess(project, callerID, core.RoleViewer) {
		logger.Logger.Warn("GetProjectByID: Access denied", zap.String("projectID", projectID), zap.String("callerID", callerID))
		return nil, ErrProjectAccessDenied
	}

	return project, nil
}

// ListProjects retrieves projects where the user is a team member.
func (s *projectService) ListProjects(ctx context.Context, userID string, statusFilter string, limit, offset int) (*ListProjectsResponse, error) {
	// Validate limit/offset
	if limit <= 0 {
		limit = 20 // Default limit
	}
	if offset < 0 {
		offset = 0
	}

	// Use userID for repository query
	projects, err := s.projectRepo.ListProjects(ctx, userID, statusFilter, limit, offset)
	if err != nil {
		logger.Logger.Error("Repository error listing projects", zap.Error(err), zap.String("userID", userID))
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}

	// Get total count for pagination metadata, using userID
	total, err := s.projectRepo.CountProjects(ctx, userID, statusFilter)
	if err != nil {
		logger.Logger.Error("Repository error counting projects", zap.Error(err), zap.String("userID", userID))
		return nil, fmt.Errorf("failed to count projects: %w", err)
	}

	// Ensure projects slice is not nil if empty
	if projects == nil {
		projects = []*core.Project{}
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
		if project == nil && err == nil { // Check repo not found convention
			return nil, ErrProjectNotFound
		}
		logger.Logger.Error("UpdateProject: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project for update: %w", err)
	}
	if project == nil { // Explicit check if repo returned nil, nil
		return nil, ErrProjectNotFound
	}

	// 2. Authorization Check: User must be Admin or Owner to update settings/details
	if !s.checkProjectAccess(project, callerID, core.RoleAdmin) {
		logger.Logger.Warn("UpdateProject: Access denied", zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("requiredRole", string(core.RoleAdmin)))
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
		project.Status = *req.Status
		updated = true
	}
	if req.Settings != nil {
		// Simple overwrite for now, could be more granular
		project.Settings = *req.Settings
		updated = true
		// TODO: Potentially update bucket lifecycle policy if retention changes
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
		if project == nil && err == nil { // Check repo not found convention
			return ErrProjectNotFound
		}
		logger.Logger.Error("DeleteProject: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return fmt.Errorf("failed to retrieve project for deletion: %w", err)
	}
	if project == nil { // Explicit check if repo returned nil, nil
		return ErrProjectNotFound
	}

	// 2. Authorization Check: User must be Owner to delete
	if !s.checkProjectAccess(project, callerID, core.RoleOwner) {
		logger.Logger.Warn("DeleteProject: Access denied", zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("requiredRole", string(core.RoleOwner)))
		return ErrProjectAccessDenied
	}

	// 3. Delete associated storage bucket
	if project.Storage.BucketName != "" {
		err = s.storageSvc.DeleteProjectBucket(ctx, project.Storage.BucketName, true) // Force delete contents
		if err != nil {
			logger.Logger.Error("DeleteProject: Failed to delete storage bucket, proceeding to delete project document", zap.Error(err), zap.String("projectID", projectID), zap.String("bucketName", project.Storage.BucketName))
			// Decide policy: Return error or just log? Returning error for now.
			return ErrBucketDeletionFailed
		}
		logger.Logger.Info("Associated GCS bucket deleted", zap.String("bucketName", project.Storage.BucketName))
	}

	// 4. Delete the project document from repository
	err = s.projectRepo.DeleteProject(ctx, projectID)
	if err != nil {
		// Repo might return specific error for NotFound, handle it gracefully
		if errors.Is(err, core.ErrNotFound) || status.Code(err) == codes.NotFound { // Example check
			logger.Logger.Warn("DeleteProject: Project document not found during deletion, assuming already deleted", zap.String("projectID", projectID))
			return nil // Treat as success if not found
		}
		logger.Logger.Error("DeleteProject: Failed to delete project document", zap.Error(err), zap.String("projectID", projectID))
		return fmt.Errorf("failed to delete project document: %w", err)
	}

	logger.Logger.Info("Project deleted successfully", zap.String("projectID", projectID))
	return nil
}

// --- Authorization Helper Methods ---

// checkProjectAccess verifies if a user has the required minimum role for a project.
func (s *projectService) checkProjectAccess(project *core.Project, userID string, requiredRole core.Role) bool {
	if project == nil || project.TeamMembers == nil {
		return false
	}

	userRole, exists := project.TeamMembers[userID]
	if !exists {
		return false // User is not on the team
	}

	// Define role hierarchy (higher value means more permissions)
	roleHierarchy := map[core.Role]int{
		core.RoleViewer: 1,
		core.RoleMember: 2,
		core.RoleAdmin:  3,
		core.RoleOwner:  4,
	}

	userLevel, okUser := roleHierarchy[userRole]
	requiredLevel, okRequired := roleHierarchy[requiredRole]

	// Ensure both roles are valid and user's level is sufficient
	return okUser && okRequired && userLevel >= requiredLevel
}

// UpdateMemberRole changes the role of a target user within a project.
func (s *projectService) UpdateMemberRole(ctx context.Context, projectID string, callerID string, targetUserID string, newRole core.Role) (*core.Project, error) {
	// 1. Get the existing project
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		if project == nil && err == nil { // Check repo not found convention
			return nil, ErrProjectNotFound
		}
		logger.Logger.Error("UpdateMemberRole: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project for update: %w", err)
	}
	if project == nil { // Explicit check if repo returned nil, nil
		return nil, ErrProjectNotFound
	}

	// 2. Authorization Check: User must be Admin or Owner to update team members
	if !s.checkProjectAccess(project, callerID, core.RoleAdmin) {
		logger.Logger.Warn("UpdateMemberRole: Access denied", zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("requiredRole", string(core.RoleAdmin)))
		return nil, ErrProjectAccessDenied
	}

	// 3. Validation:
	// 3a. Check if target user exists
	currentTargetRole, exists := project.TeamMembers[targetUserID]
	if !exists {
		logger.Logger.Warn("UpdateMemberRole: Target user not found in project team", zap.String("projectID", projectID), zap.String("targetUserID", targetUserID))
		// Return NotFound or a specific "MemberNotFound" error?
		return nil, fmt.Errorf("target user %s not found in project %s", targetUserID, projectID) // Consider a specific error type
	}

	// 3b. Prevent changing the Owner role via this method.
	if currentTargetRole == core.RoleOwner {
		logger.Logger.Warn("UpdateMemberRole: Cannot change Owner role via this method", zap.String("projectID", projectID), zap.String("targetUserID", targetUserID))
		return nil, fmt.Errorf("cannot change the role of the project owner") // Consider a specific error type
	}

	// 3c. Prevent assigning Owner role via this method (should use a separate transfer ownership flow)
	if newRole == core.RoleOwner {
		logger.Logger.Warn("UpdateMemberRole: Cannot assign Owner role via this method", zap.String("projectID", projectID), zap.String("targetUserID", targetUserID))
		return nil, fmt.Errorf("cannot assign owner role via this method")
	}

	// 3d. Optional: Prevent self-role change via this method?
	if callerID == targetUserID {
		logger.Logger.Warn("UpdateMemberRole: User attempted to change own role", zap.String("projectID", projectID), zap.String("callerID", callerID))
		return nil, fmt.Errorf("cannot change your own role via this method")
	}

	// 4. Update the role of the target user in the map
	if project.TeamMembers[targetUserID] == newRole {
		logger.Logger.Info("UpdateMemberRole: Role is already set to the target value, no update needed", zap.String("projectID", projectID), zap.String("targetUserID", targetUserID))
		return project, nil // No change needed
	}
	project.TeamMembers[targetUserID] = newRole

	// 5. Update the project in the repository
	project.UpdatedAt = time.Now().UTC()
	err = s.projectRepo.UpdateProject(ctx, project)
	if err != nil {
		// Revert local change? Probably not necessary as it's in memory.
		logger.Logger.Error("UpdateMemberRole: Failed to save updates", zap.Error(err), zap.String("projectID", projectID))
		return nil, ErrProjectUpdateFailed
	}

	logger.Logger.Info("Project team member role updated successfully", zap.String("projectID", projectID), zap.String("targetUserID", targetUserID), zap.String("newRole", string(newRole)))
	return project, nil
}

// RemoveMember removes a target user from a project's team.
func (s *projectService) RemoveMember(ctx context.Context, projectID string, callerID string, targetUserID string) (*core.Project, error) {
	// 1. Get the existing project
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		if project == nil && err == nil { // Check repo not found convention
			return nil, ErrProjectNotFound
		}
		logger.Logger.Error("RemoveMember: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project for removal: %w", err)
	}
	if project == nil { // Explicit check if repo returned nil, nil
		return nil, ErrProjectNotFound
	}

	// 2. Check if target user exists
	targetUserRole, exists := project.TeamMembers[targetUserID]
	if !exists {
		logger.Logger.Warn("RemoveMember: Target user not found in project team", zap.String("projectID", projectID), zap.String("targetUserID", targetUserID))
		return nil, fmt.Errorf("target user %s not found in project %s", targetUserID, projectID)
	}

	// 3. Authorization Check:
	// 3a. User removing themselves (leaving)
	if callerID == targetUserID {
		// Any role can leave, EXCEPT the last owner.
		if targetUserRole == core.RoleOwner && s.isLastOwner(project) {
			logger.Logger.Warn("RemoveMember: Last owner cannot remove themselves", zap.String("projectID", projectID), zap.String("callerID", callerID))
			return nil, fmt.Errorf("last owner cannot leave the project; transfer ownership first")
		}
		// Allow self-removal (leave project)
		logger.Logger.Info("User is removing themselves from the project", zap.String("projectID", projectID), zap.String("callerID", callerID))
	} else {
		// 3b. Admin/Owner removing someone else
		if !s.checkProjectAccess(project, callerID, core.RoleAdmin) {
			logger.Logger.Warn("RemoveMember: Caller lacks permission to remove others", zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", targetUserID))
			return nil, ErrProjectAccessDenied
		}
		// 3c. Prevent Admin/Owner from removing the Owner (must transfer first)
		if targetUserRole == core.RoleOwner {
			logger.Logger.Warn("RemoveMember: Cannot remove project owner", zap.String("projectID", projectID), zap.String("callerID", callerID), zap.String("targetUserID", targetUserID))
			return nil, fmt.Errorf("project owner cannot be removed; transfer ownership first")
		}
	}

	// 4. Remove the target user from the project's team map
	delete(project.TeamMembers, targetUserID)

	// 5. Update the project in the repository
	project.UpdatedAt = time.Now().UTC()
	err = s.projectRepo.UpdateProject(ctx, project)
	if err != nil {
		// Revert local change?
		logger.Logger.Error("RemoveMember: Failed to save updates after removing member", zap.Error(err), zap.String("projectID", projectID))
		return nil, ErrProjectUpdateFailed
	}

	logger.Logger.Info("Project team member removed successfully", zap.String("projectID", projectID), zap.String("removedUserID", targetUserID), zap.String("callerID", callerID))
	return project, nil
}

// isLastOwner is a helper to check if a project has only one owner.
func (s *projectService) isLastOwner(project *core.Project) bool {
	if project == nil || project.TeamMembers == nil {
		return false // Or handle as an error?
	}
	ownerCount := 0
	for _, role := range project.TeamMembers {
		if role == core.RoleOwner {
			ownerCount++
		}
	}
	return ownerCount <= 1
}

// InviteMember adds a registered user to the project team with a specified role.
func (s *projectService) InviteMember(ctx context.Context, projectID string, callerID string, req InviteMemberRequest) (*core.Project, error) {
	// 1. Get the existing project
	project, err := s.projectRepo.GetProjectByID(ctx, projectID)
	if err != nil {
		if project == nil && err == nil { // Check repo not found convention
			return nil, ErrProjectNotFound
		}
		logger.Logger.Error("InviteMember: Failed to get project", zap.Error(err), zap.String("projectID", projectID))
		return nil, fmt.Errorf("failed to retrieve project for invitation: %w", err)
	}
	if project == nil { // Explicit check if repo returned nil, nil
		return nil, ErrProjectNotFound
	}

	// 2. Authorization Check: User must be Admin or Owner to invite
	if !s.checkProjectAccess(project, callerID, core.RoleAdmin) {
		logger.Logger.Warn("InviteMember: Caller lacks permission",
			zap.String("projectID", projectID),
			zap.String("callerID", callerID),
			zap.String("requiredRole", string(core.RoleAdmin)),
		)
		return nil, ErrProjectAccessDenied
	}

	// 3. Validation:
	// 3a. Check if target user is already a member
	if _, exists := project.TeamMembers[req.UserID]; exists {
		logger.Logger.Warn("InviteMember: Target user already exists in team",
			zap.String("projectID", projectID),
			zap.String("targetUserID", req.UserID),
		)
		return nil, fmt.Errorf("user %s is already a member of this project", req.UserID) // Consider specific error type
	}

	// 3b. Check if the target user ID actually exists in the system
	// This prevents inviting non-existent users.
	targetUser, err := s.userRepo.GetUserByID(ctx, req.UserID)
	if err != nil {
		logger.Logger.Error("InviteMember: Failed to check target user existence", zap.Error(err), zap.String("targetUserID", req.UserID))
		return nil, fmt.Errorf("failed to verify target user: %w", err)
	}
	if targetUser == nil {
		logger.Logger.Warn("InviteMember: Target user does not exist", zap.String("targetUserID", req.UserID))
		return nil, fmt.Errorf("user with ID %s not found", req.UserID) // Consider specific error type
	}

	// 3c. Role validation (already handled by DTO binding, but defensive check)
	if req.Role != core.RoleAdmin && req.Role != core.RoleMember && req.Role != core.RoleViewer {
		logger.Logger.Error("InviteMember: Invalid role specified (should be caught by binding)", zap.String("role", string(req.Role)))
		return nil, fmt.Errorf("invalid role specified: %s", req.Role)
	}

	// 4. Add the target user to the project's TeamMembers map
	if project.TeamMembers == nil {
		project.TeamMembers = make(map[string]core.Role)
	}
	project.TeamMembers[req.UserID] = req.Role

	// 5. Update the project in the repository
	project.UpdatedAt = time.Now().UTC()
	err = s.projectRepo.UpdateProject(ctx, project)
	if err != nil {
		logger.Logger.Error("InviteMember: Failed to save updates after adding member", zap.Error(err), zap.String("projectID", projectID))
		return nil, ErrProjectUpdateFailed
	}

	logger.Logger.Info("Project team member invited successfully",
		zap.String("projectID", projectID),
		zap.String("invitedUserID", req.UserID),
		zap.String("assignedRole", string(req.Role)),
		zap.String("callerID", callerID),
	)
	return project, nil
}
