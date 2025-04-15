package firestore

import (
	"context"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"SynDataGen/backend/internal/core"
)

const jobCollection = "jobs"

// jobRepository implements the core.JobRepository interface using Firestore.
type jobRepository struct {
	client *firestore.Client
	logger *log.Logger
}

// NewJobRepository creates a new Firestore job repository.
func NewJobRepository(client *firestore.Client, logger *log.Logger) core.JobRepository {
	if logger == nil {
		logger = log.Default()
	}
	return &jobRepository{
		client: client,
		logger: logger,
	}
}

// CreateJob adds a new job document to the Firestore 'jobs' collection.
func (r *jobRepository) CreateJob(ctx context.Context, job *core.Job) error {
	if job.ID == "" {
		return fmt.Errorf("job ID cannot be empty") // Ensure ID is set before creation
	}
	r.logger.Printf("Creating job document with ID: %s", job.ID)
	job.CreatedAt = time.Now().UTC()
	job.UpdatedAt = job.CreatedAt // Set UpdatedAt initially

	_, err := r.client.Collection(jobCollection).Doc(job.ID).Create(ctx, job)
	if err != nil {
		if status.Code(err) == codes.AlreadyExists {
			r.logger.Printf("Job document with ID %s already exists", job.ID)
			return fmt.Errorf("job with ID %s already exists: %w", job.ID, err)
		}
		r.logger.Printf("Error creating job document %s: %v", job.ID, err)
		return fmt.Errorf("failed to create job document %s in firestore: %w", job.ID, err)
	}
	r.logger.Printf("Successfully created job document %s", job.ID)
	return nil
}

// GetJobByID retrieves a job document by its ID from Firestore.
func (r *jobRepository) GetJobByID(ctx context.Context, jobID string) (*core.Job, error) {
	r.logger.Printf("Fetching job document with ID: %s", jobID)
	dsnap, err := r.client.Collection(jobCollection).Doc(jobID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			r.logger.Printf("Job document %s not found", jobID)
			return nil, core.ErrNotFound // Use predefined error
		}
		r.logger.Printf("Error fetching job document %s: %v", jobID, err)
		return nil, fmt.Errorf("failed to get job document %s from firestore: %w", jobID, err)
	}

	var job core.Job
	if err := dsnap.DataTo(&job); err != nil {
		r.logger.Printf("Error converting firestore data to Job struct for ID %s: %v", jobID, err)
		return nil, fmt.Errorf("failed to decode job document %s: %w", jobID, err)
	}
	job.ID = dsnap.Ref.ID // Assign the document ID to the struct
	r.logger.Printf("Successfully fetched job document %s", jobID)
	return &job, nil
}

// ListJobsByProjectID retrieves jobs associated with a project, with pagination.
func (r *jobRepository) ListJobsByProjectID(ctx context.Context, projectID string, limit, offset int) ([]*core.Job, int, error) {
	r.logger.Printf("Listing jobs for project %s (limit: %d, offset: %d)", projectID, limit, offset)

	if limit <= 0 {
		limit = 20 // Default limit
	}
	if offset < 0 {
		offset = 0
	}

	collRef := r.client.Collection(jobCollection)
	baseQuery := collRef.Where("projectId", "==", projectID).OrderBy("createdAt", firestore.Desc)

	// Get Total Count first (before applying limit/offset for pagination)
	countQuery := baseQuery
	countSnap, err := countQuery.Documents(ctx).GetAll()
	if err != nil {
		r.logger.Printf("Error counting jobs for project %s: %v", projectID, err)
		return nil, 0, fmt.Errorf("failed to count jobs for project %s: %w", projectID, err)
	}
	totalCount := len(countSnap)
	r.logger.Printf("Total jobs found for project %s: %d", projectID, totalCount)

	// Apply pagination to the main query
	pagedQuery := baseQuery.Offset(offset).Limit(limit)
	iter := pagedQuery.Documents(ctx)
	defer iter.Stop()

	var jobs []*core.Job
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			r.logger.Printf("Error iterating job documents for project %s: %v", projectID, err)
			return nil, 0, fmt.Errorf("failed to iterate job documents for project %s: %w", projectID, err)
		}

		var job core.Job
		if err := doc.DataTo(&job); err != nil {
			r.logger.Printf("Error converting firestore data to Job struct during list (doc ID %s): %v", doc.Ref.ID, err)
			// Decide whether to skip this doc or return an error
			continue // Skip corrupted document for now
		}
		job.ID = doc.Ref.ID
		jobs = append(jobs, &job)
	}

	r.logger.Printf("Successfully listed %d jobs for project %s (page limit %d, offset %d)", len(jobs), projectID, limit, offset)
	return jobs, totalCount, nil
}

// UpdateJobStatus updates specific fields of a job document (status, timestamps, error, pipeline ID).
func (r *jobRepository) UpdateJobStatus(ctx context.Context, jobID string, newStatus core.JobStatus, pipelineJobID string, startedAt, completedAt *time.Time, jobError string) error {
	r.logger.Printf("Updating status for job %s to %s (Pipeline ID: %s)", jobID, newStatus, pipelineJobID)

	docRef := r.client.Collection(jobCollection).Doc(jobID)
	updates := []firestore.Update{
		{Path: "status", Value: newStatus},
		{Path: "updatedAt", Value: time.Now().UTC()},
	}

	// Only add pipelineJobID update if it's not empty
	if pipelineJobID != "" {
		updates = append(updates, firestore.Update{Path: "pipelineJobId", Value: pipelineJobID})
	}

	if startedAt != nil {
		updates = append(updates, firestore.Update{Path: "startedAt", Value: *startedAt})
	}
	if completedAt != nil {
		updates = append(updates, firestore.Update{Path: "completedAt", Value: *completedAt})
	}
	if jobError != "" {
		updates = append(updates, firestore.Update{Path: "error", Value: jobError})
	} else {
		// Ensure error field is cleared if status is not 'failed'
		if newStatus != core.JobStatusFailed {
			updates = append(updates, firestore.Update{Path: "error", Value: firestore.Delete})
		}
	}

	_, err := docRef.Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			r.logger.Printf("Job document %s not found for status update", jobID)
			return core.ErrNotFound
		}
		r.logger.Printf("Error updating status for job %s: %v", jobID, err)
		return fmt.Errorf("failed to update status for job %s: %w", jobID, err)
	}

	r.logger.Printf("Successfully updated status for job %s", jobID)
	return nil
}

// UpdateJobResult updates the result URI of a completed job document.
func (r *jobRepository) UpdateJobResult(ctx context.Context, jobID string, resultURI string) error {
	r.logger.Printf("Updating result URI for job %s", jobID)
	docRef := r.client.Collection(jobCollection).Doc(jobID)
	updates := []firestore.Update{
		{Path: "resultUri", Value: resultURI},
		{Path: "updatedAt", Value: time.Now().UTC()},
	}

	_, err := docRef.Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			r.logger.Printf("Job document %s not found for result update", jobID)
			return core.ErrNotFound
		}
		r.logger.Printf("Error updating result URI for job %s: %v", jobID, err)
		return fmt.Errorf("failed to update result URI for job %s: %w", jobID, err)
	}

	r.logger.Printf("Successfully updated result URI for job %s", jobID)
	return nil
}
