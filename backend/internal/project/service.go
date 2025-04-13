package project

import (
	"SynDataGen/backend/internal/core"
	"context"
)

// Define DTOs based on OpenAPI spec

// CreateProjectRequest mirrors the request body for creating a project.
type CreateProjectRequest struct {
	Name        string               `json:"name" binding:"required"`
	Description string               `json:"description" binding:"required"`
	Settings    core.ProjectSettings `json:"settings" binding:"required"`
	// Region string? // If needed for bucket creation
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

// ProjectService defines the interface for project-related business logic.
type ProjectService interface {
	// CreateProject handles the logic for creating a new project, including setting up storage.
	// It takes the customer ID (e.g., from authenticated user context).
	CreateProject(ctx context.Context, customerID string, req CreateProjectRequest) (*core.Project, error)

	// GetProjectByID retrieves a specific project, ensuring the caller has access.
	GetProjectByID(ctx context.Context, projectID string, callerID string) (*core.Project, error)

	// ListProjects retrieves projects for a specific customer, applying filters and pagination.
	ListProjects(ctx context.Context, customerID string, statusFilter string, limit, offset int) (*ListProjectsResponse, error)

	// UpdateProject handles updating project details.
	// Requires projectID and the ID of the user making the request for authorization checks.
	UpdateProject(ctx context.Context, projectID string, callerID string, req UpdateProjectRequest) (*core.Project, error)

	// DeleteProject handles deleting (or archiving) a project.
	// Requires projectID and the ID of the user making the request for authorization checks.
	DeleteProject(ctx context.Context, projectID string, callerID string) error

	// TODO: Add methods for managing team members (Invite, Remove, UpdateRole)
}
