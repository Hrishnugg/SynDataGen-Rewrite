package firestore

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/platform/logger"
	"context"
	"fmt"
	"time"

	fs "cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const jobsCollection = "jobs"

// jobRepository implements the core.JobRepository interface using Firestore.
type jobRepository struct {
	client *fs.Client
}

// NewJobRepository creates a new Firestore job repository.
func NewJobRepository(client *fs.Client) core.JobRepository {
	return &jobRepository{
		client: client,
	}
}

// CreateJob adds a new job document to the Firestore 'jobs' collection.
func (r *jobRepository) CreateJob(ctx context.Context, job *core.Job) error {
	// Use the Job.ID as the Firestore document ID
	if job.ID == "" {
		// This should ideally be set by the service layer before calling the repo
		logger.Logger.Error("Job ID is empty during CreateJob. Service layer must set this.")
		return fmt.Errorf("job ID cannot be empty")
	}

	// Use the provided job.ID as the document ID
	_, err := r.client.Collection(jobsCollection).Doc(job.ID).Set(ctx, job)
	if err != nil {
		logger.Logger.Error("Failed to set job in Firestore", zap.String("jobId", job.ID), zap.Error(err))
		return fmt.Errorf("firestore set job: %w", err)
	}
	logger.Logger.Info("Successfully created job in Firestore", zap.String("jobId", job.ID))
	return nil
}

// GetJobByID retrieves a job document by its ID from Firestore.
func (r *jobRepository) GetJobByID(ctx context.Context, jobID string) (*core.Job, error) {
	dsnap, err := r.client.Collection(jobsCollection).Doc(jobID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			// Return a standard error defined in core package (or create one)
			return nil, core.ErrNotFound
		}
		logger.Logger.Error("Failed to get job from Firestore", zap.String("jobId", jobID), zap.Error(err))
		return nil, fmt.Errorf("firestore get job: %w", err)
	}

	var job core.Job
	if err := dsnap.DataTo(&job); err != nil {
		logger.Logger.Error("Failed to decode job data from Firestore", zap.String("jobId", jobID), zap.Error(err))
		return nil, fmt.Errorf("firestore decode job: %w", err)
	}
	// Ensure the ID field is populated from the document snapshot ID
	job.ID = dsnap.Ref.ID
	return &job, nil
}

// ListJobsByProjectID retrieves jobs for a specific project, ordered by creation date.
func (r *jobRepository) ListJobsByProjectID(ctx context.Context, projectID string, limit, offset int) ([]*core.Job, int, error) {
	var jobs []*core.Job
	// Query for jobs matching the project ID, ordered by creation time descending.
	baseQuery := r.client.Collection(jobsCollection).Where("ProjectID", "==", projectID).OrderBy("CreatedAt", fs.Desc)

	// Get total count for pagination info (can be expensive on large collections)
	// Consider alternative strategies if performance becomes an issue.
	countQuery := baseQuery
	countSnapshots, err := countQuery.Documents(ctx).GetAll()
	if err != nil {
		logger.Logger.Error("Failed to count jobs in Firestore", zap.String("projectId", projectID), zap.Error(err))
		return nil, 0, fmt.Errorf("firestore count jobs: %w", err)
	}
	totalCount := len(countSnapshots)

	// Build the query with pagination
	query := baseQuery
	if limit <= 0 {
		limit = 20 // Default limit if not specified or invalid
	}
	query = query.Limit(limit)

	if offset > 0 {
		// Firestore offset is inefficient. Prefer cursor-based pagination in production.
		// This implementation uses offset for simplicity as per interface, but be aware.
		query = query.Offset(offset)
		logger.Logger.Warn("Using offset-based pagination for ListJobsByProjectID. Consider cursor-based for efficiency.", zap.String("projectId", projectID), zap.Int("offset", offset))
	}

	// Execute the query
	iter := query.Documents(ctx)
	defer iter.Stop()
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			logger.Logger.Error("Failed to iterate job documents", zap.String("projectId", projectID), zap.Error(err))
			return nil, 0, fmt.Errorf("firestore iterate jobs: %w", err)
		}

		var job core.Job
		if err := doc.DataTo(&job); err != nil {
			logger.Logger.Error("Failed to decode job data during list", zap.String("docId", doc.Ref.ID), zap.Error(err))
			continue // Skip problematic document
		}
		job.ID = doc.Ref.ID // Ensure ID is set from Firestore doc ID
		jobs = append(jobs, &job)
	}

	// Return the fetched jobs, the total count, and no error
	return jobs, totalCount, nil
}

// UpdateJobStatus updates specific fields of a job document.
func (r *jobRepository) UpdateJobStatus(ctx context.Context, jobID string, newStatus core.JobStatus, startedAt, completedAt *time.Time, jobError string) error {
	updates := []fs.Update{
		{Path: "Status", Value: newStatus},
		{Path: "Error", Value: jobError}, // Always update error (might clear previous error)
	}
	if startedAt != nil {
		updates = append(updates, fs.Update{Path: "StartedAt", Value: startedAt})
	} else {
		// Explicitly set to nil if needed, otherwise Firestore might merge
		// updates = append(updates, fs.Update{Path: "StartedAt", Value: nil})
	}
	if completedAt != nil {
		updates = append(updates, fs.Update{Path: "CompletedAt", Value: completedAt})
	} else {
		// Explicitly set to nil if needed
		// updates = append(updates, fs.Update{Path: "CompletedAt", Value: nil})
	}

	_, err := r.client.Collection(jobsCollection).Doc(jobID).Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return core.ErrNotFound
		}
		logger.Logger.Error("Failed to update job status in Firestore", zap.String("jobId", jobID), zap.Error(err))
		return fmt.Errorf("firestore update job status: %w", err)
	}
	logger.Logger.Info("Successfully updated job status", zap.String("jobId", jobID), zap.String("newStatus", string(newStatus)))
	return nil
}

// UpdateJobResult updates the result URI field of a job document.
func (r *jobRepository) UpdateJobResult(ctx context.Context, jobID string, resultURI string) error {
	updates := []fs.Update{
		{Path: "ResultURI", Value: resultURI},
	}
	_, err := r.client.Collection(jobsCollection).Doc(jobID).Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return core.ErrNotFound
		}
		logger.Logger.Error("Failed to update job result URI in Firestore", zap.String("jobId", jobID), zap.Error(err))
		return fmt.Errorf("firestore update job result: %w", err)
	}
	logger.Logger.Info("Successfully updated job result URI", zap.String("jobId", jobID), zap.String("resultUri", resultURI))
	return nil
}
