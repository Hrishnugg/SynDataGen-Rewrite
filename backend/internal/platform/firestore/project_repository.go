package firestore

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"
	firestorepb "google.golang.org/genproto/googleapis/firestore/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const projectsCollection = "projects"

// projectRepository implements the core.ProjectRepository interface using Firestore.
type projectRepository struct {
	client *firestore.Client
	logger *zap.Logger
}

// NewProjectRepository creates a new Firestore-based project repository.
func NewProjectRepository(client *firestore.Client) core.ProjectRepository {
	if client == nil {
		panic("Firestore client cannot be nil for ProjectRepository")
	}
	return &projectRepository{
		client: client,
		logger: logger.Logger,
	}
}

// CreateProject saves a new project.
func (r *projectRepository) CreateProject(ctx context.Context, project *core.Project) (string, error) {
	docRef, _, err := r.client.Collection(projectsCollection).Add(ctx, project)
	if err != nil {
		r.logger.Error("Failed to add project to Firestore",
			zap.Error(err),
			zap.String("customerID", project.CustomerID),
			zap.String("projectName", project.Name),
		)
		return "", fmt.Errorf("failed to add project to Firestore: %w", err)
	}
	r.logger.Info("Created project document", zap.String("projectID", docRef.ID))
	return docRef.ID, nil
}

// GetProjectByID retrieves a project by its unique ID.
func (r *projectRepository) GetProjectByID(ctx context.Context, id string) (*core.Project, error) {
	docSnap, err := r.client.Collection(projectsCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil // Not found is not an error
		}
		r.logger.Error("Failed to get project by ID", zap.Error(err), zap.String("projectID", id))
		return nil, fmt.Errorf("failed to get project by ID: %w", err)
	}

	var project core.Project
	if err := docSnap.DataTo(&project); err != nil {
		r.logger.Error("Failed to decode project data", zap.Error(err), zap.String("projectID", id))
		return nil, fmt.Errorf("failed to decode project data: %w", err)
	}
	project.ID = docSnap.Ref.ID

	return &project, nil
}

// buildProjectQuery constructs a Firestore query based on filters.
// It filters projects where the given userID exists as a key in the teamMembers map.
func (r *projectRepository) buildProjectQuery(ctx context.Context, userID string, statusFilter string) firestore.Query {
	query := r.client.Collection(projectsCollection).Query

	// Filter by team membership: Check if the user's ID exists as a key in the teamMembers map.
	// Using '!=' with a non-existent value implicitly checks for key presence.
	// See: https://firebase.google.com/docs/firestore/query-data/queries#query_operators
	query = query.Where(fmt.Sprintf("teamMembers.%s", userID), "!=", "__non_existent_value__") // Revert to != check

	// TODO: Re-evaluate if filtering by project status is still needed or handled differently with RBAC.
	// if statusFilter != "" && statusFilter != "all" { // Allow filtering by specific status
	// 	query = query.Where("status", "==", statusFilter)
	// }
	return query
}

// ListProjects retrieves a list of projects where the user is a team member.
func (r *projectRepository) ListProjects(ctx context.Context, userID string, statusFilter string, limit, offset int) ([]*core.Project, error) {
	query := r.buildProjectQuery(ctx, userID, statusFilter)

	// Apply sorting (e.g., by creation date descending)
	query = query.OrderBy("createdAt", firestore.Desc)

	// Apply pagination
	if offset > 0 {
		// Firestore offset requires OrderBy. To implement offset reliably,
		// usually requires fetching previous docs or using cursors (StartAfter).
		// Simple offset implementation (might be less efficient at scale):
		query = query.Offset(offset)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}

	iter := query.Documents(ctx)
	var projects []*core.Project
	var docCount int // Counter for logging
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			r.logger.Debug("ListProjects: Iterator finished", zap.Int("docsProcessed", docCount))
			break
		}
		if err != nil {
			r.logger.Error("ListProjects: Failed to iterate project documents", zap.Error(err))
			return nil, fmt.Errorf("failed to list projects: %w", err)
		}
		docCount++                                                                           // Increment counter
		r.logger.Debug("ListProjects: Processing document", zap.String("docID", doc.Ref.ID)) // Log doc ID

		var project core.Project
		if err := doc.DataTo(&project); err != nil {
			r.logger.Error("ListProjects: Failed to decode project data during list", zap.Error(err), zap.String("docID", doc.Ref.ID))
			continue // Skip problematic document
		}
		project.ID = doc.Ref.ID
		projects = append(projects, &project)
	}

	r.logger.Info("Project repository ListProjects returning projects", zap.Int("count", len(projects))) // Changed log message
	return projects, nil
}

// CountProjects retrieves the total count of projects where the user is a team member.
func (r *projectRepository) CountProjects(ctx context.Context, userID string, statusFilter string) (int, error) {
	query := r.buildProjectQuery(ctx, userID, statusFilter)

	// Use aggregation query for count
	aggregationQuery := query.NewAggregationQuery().WithCount("all")
	results, err := aggregationQuery.Get(ctx)
	if err != nil {
		r.logger.Error("Failed to execute count aggregation query", zap.Error(err))
		return 0, fmt.Errorf("failed to count projects: %w", err)
	}

	countResult, ok := results["all"]
	if !ok {
		// If the 'all' key isn't present, assume count is 0 (or log a warning)
		r.logger.Warn("Count result key 'all' not found in aggregation result, assuming count is 0")
		return 0, nil
	}

	// Log the raw result and its type before attempting cast
	r.logger.Debug("CountProjects: Received aggregation result", zap.Any("resultValue", countResult), zap.String("resultType", fmt.Sprintf("%T", countResult)))

	// Assert to firestorepb.Value and extract IntegerValue
	countProtoValue, ok := countResult.(*firestorepb.Value)
	if !ok {
		// If the type assertion to *firestorepb.Value fails, log warning and return 0
		r.logger.Warn("Failed to cast count aggregation result to *firestorepb.Value, assuming count is 0", zap.Any("resultType", fmt.Sprintf("%T", countResult)))
		return 0, nil
	}

	// Extract the int64 value from the proto
	countValue := countProtoValue.GetIntegerValue()

	return int(countValue), nil
}

// UpdateProject updates an existing project.
func (r *projectRepository) UpdateProject(ctx context.Context, project *core.Project) error {
	if project.ID == "" {
		return fmt.Errorf("project ID is required for update")
	}
	docRef := r.client.Collection(projectsCollection).Doc(project.ID)

	// Use Set to overwrite the document with the provided struct data.
	// Removed MergeAll as it requires map data and Set with struct overwrites.
	_, err := docRef.Set(ctx, project)
	if err != nil {
		r.logger.Error("Failed to update project in Firestore",
			zap.Error(err),
			zap.String("projectID", project.ID),
		)
		return fmt.Errorf("failed to update project: %w", err)
	}
	r.logger.Info("Updated project document", zap.String("projectID", project.ID))
	return nil
}

// DeleteProject removes a project.
func (r *projectRepository) DeleteProject(ctx context.Context, id string) error {
	_, err := r.client.Collection(projectsCollection).Doc(id).Delete(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			r.logger.Warn("Attempted to delete non-existent project", zap.String("projectID", id))
			return nil // Deleting a non-existent doc is not an error
		}
		r.logger.Error("Failed to delete project from Firestore",
			zap.Error(err),
			zap.String("projectID", id),
		)
		return fmt.Errorf("failed to delete project: %w", err)
	}
	r.logger.Info("Deleted project document", zap.String("projectID", id))
	return nil
}
