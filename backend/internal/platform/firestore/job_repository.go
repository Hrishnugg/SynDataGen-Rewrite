package firestore

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"SynDataGen/backend/internal/core"

	"go.uber.org/zap"
)

const (
	jobCollection    = "jobs"
	firestoreInLimit = 30 // Firestore 'in' query limit
)

// jobRepository implements the core.JobRepository interface using Firestore.
type jobRepository struct {
	client *firestore.Client
	logger *zap.Logger
}

// NewJobRepository creates a new Firestore job repository.
func NewJobRepository(client *firestore.Client, logger *zap.Logger) core.JobRepository {
	if logger == nil {
		logger = zap.L() // Use global logger if none provided
	}
	return &jobRepository{
		client: client,
		logger: logger.Named("JobRepository"),
	}
}

// CreateJob adds a new job document to the Firestore 'jobs' collection.
func (r *jobRepository) CreateJob(ctx context.Context, job *core.Job) error {
	if job.ID == "" {
		return fmt.Errorf("job ID cannot be empty") // Ensure ID is set before creation
	}
	r.logger.Info("Creating job document with ID", zap.String("jobID", job.ID))
	job.CreatedAt = time.Now().UTC()
	job.UpdatedAt = job.CreatedAt // Set UpdatedAt initially

	_, err := r.client.Collection(jobCollection).Doc(job.ID).Create(ctx, job)
	if err != nil {
		if status.Code(err) == codes.AlreadyExists {
			r.logger.Info("Job document with ID already exists", zap.String("jobID", job.ID))
			return fmt.Errorf("job with ID %s already exists: %w", job.ID, err)
		}
		r.logger.Error("Error creating job document", zap.String("jobID", job.ID), zap.Error(err))
		return fmt.Errorf("failed to create job document %s in firestore: %w", job.ID, err)
	}
	r.logger.Info("Successfully created job document", zap.String("jobID", job.ID))
	return nil
}

// GetJobByID retrieves a job document by its ID from Firestore.
func (r *jobRepository) GetJobByID(ctx context.Context, jobID string) (*core.Job, error) {
	r.logger.Info("Fetching job document with ID", zap.String("jobID", jobID))
	dsnap, err := r.client.Collection(jobCollection).Doc(jobID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			r.logger.Info("Job document not found", zap.String("jobID", jobID))
			return nil, core.ErrNotFound // Use predefined error
		}
		r.logger.Error("Error fetching job document", zap.String("jobID", jobID), zap.Error(err))
		return nil, fmt.Errorf("failed to get job document %s from firestore: %w", jobID, err)
	}

	var job core.Job
	if err := dsnap.DataTo(&job); err != nil {
		r.logger.Error("Error converting firestore data to Job struct", zap.String("jobID", jobID), zap.Error(err))
		return nil, fmt.Errorf("failed to decode job document %s: %w", jobID, err)
	}
	job.ID = dsnap.Ref.ID // Assign the document ID to the struct
	r.logger.Info("Successfully fetched job document", zap.String("jobID", jobID))
	return &job, nil
}

// ListJobsByProjectID retrieves jobs associated with a project, with pagination.
func (r *jobRepository) ListJobsByProjectID(ctx context.Context, projectID string, limit, offset int) ([]*core.Job, int, error) {
	r.logger.Info("Listing jobs for project", zap.String("projectID", projectID), zap.Int("limit", limit), zap.Int("offset", offset))

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
		r.logger.Error("Error counting jobs for project", zap.String("projectID", projectID), zap.Error(err))
		return nil, 0, fmt.Errorf("failed to count jobs for project %s: %w", projectID, err)
	}
	totalCount := len(countSnap)
	r.logger.Info("Total jobs found for project", zap.String("projectID", projectID), zap.Int("totalCount", totalCount))

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
			r.logger.Error("Error iterating job documents for project", zap.String("projectID", projectID), zap.Error(err))
			return nil, 0, fmt.Errorf("failed to iterate job documents for project %s: %w", projectID, err)
		}

		var job core.Job
		if err := doc.DataTo(&job); err != nil {
			r.logger.Warn("Error converting firestore data to Job struct during list", zap.String("docID", doc.Ref.ID), zap.Error(err))
			// Decide whether to skip this doc or return an error
			continue // Skip corrupted document for now
		}
		job.ID = doc.Ref.ID
		jobs = append(jobs, &job)
	}

	r.logger.Info("Successfully listed jobs for project", zap.String("projectID", projectID), zap.Int("returnedCount", len(jobs)), zap.Int("totalJobsFound", totalCount))
	return jobs, totalCount, nil
}

// UpdateJobStatus updates specific fields of a job document (status, timestamps, error, pipeline ID).
func (r *jobRepository) UpdateJobStatus(ctx context.Context, jobID string, newStatus core.JobStatus, pipelineJobID string, startedAt, completedAt *time.Time, jobError string) error {
	r.logger.Info("Updating status for job", zap.String("jobID", jobID), zap.String("newStatus", string(newStatus)), zap.String("pipelineJobID", pipelineJobID))

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
			r.logger.Info("Job document not found for status update", zap.String("jobID", jobID))
			return core.ErrNotFound
		}
		r.logger.Error("Error updating status for job", zap.String("jobID", jobID), zap.Error(err))
		return fmt.Errorf("failed to update status for job %s: %w", jobID, err)
	}

	r.logger.Info("Successfully updated status for job", zap.String("jobID", jobID))
	return nil
}

// UpdateJobResult updates the result URI of a completed job document.
func (r *jobRepository) UpdateJobResult(ctx context.Context, jobID string, resultURI string) error {
	r.logger.Info("Updating result URI for job", zap.String("jobID", jobID))
	docRef := r.client.Collection(jobCollection).Doc(jobID)
	updates := []firestore.Update{
		{Path: "resultUri", Value: resultURI},
		{Path: "updatedAt", Value: time.Now().UTC()},
	}

	_, err := docRef.Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			r.logger.Info("Job document not found for result update", zap.String("jobID", jobID))
			return core.ErrNotFound
		}
		r.logger.Error("Error updating result URI for job", zap.String("jobID", jobID), zap.Error(err))
		return fmt.Errorf("failed to update result URI for job %s: %w", jobID, err)
	}

	r.logger.Info("Successfully updated result URI for job", zap.String("jobID", jobID))
	return nil
}

// ListJobsAcrossProjects retrieves jobs from a list of specified project IDs.
func (r *jobRepository) ListJobsAcrossProjects(ctx context.Context, projectIDs []string, statusFilter string, limit, offset int) ([]*core.Job, int, error) {
	if len(projectIDs) == 0 {
		return []*core.Job{}, 0, nil // Nothing to query
	}

	// Chunk project IDs for Firestore 'in' query limit
	projectIDChunks := chunkSlice(projectIDs, firestoreInLimit)

	var allJobs []*core.Job
	var totalCount int = 0

	for _, chunk := range projectIDChunks {
		baseQuery := r.client.Collection(jobCollection).Where("projectId", "in", chunk)

		// Apply status filter if provided
		if statusFilter != "" {
			baseQuery = baseQuery.Where("status", "==", statusFilter)
		}

		// --- Get total count for this chunk ---
		countQuery := baseQuery.NewAggregationQuery().WithCount("all")
		results, err := countQuery.Get(ctx)
		if err != nil {
			r.logger.Error("Failed to get job count for project chunk", zap.Strings("projectIds", chunk), zap.Error(err))
			return nil, 0, fmt.Errorf("failed to count jobs for project chunk: %w", err)
		}
		count, ok := results["all"]
		if !ok {
			r.logger.Error("Count field missing from aggregation result", zap.Strings("projectIds", chunk))
			return nil, 0, fmt.Errorf("count field missing for project chunk")
		}
		// Directly access the count value from the map result after type assertion
		countValue, ok := count.(int64)
		if !ok {
			r.logger.Error("Failed to assert count result type", zap.Strings("projectIds", chunk), zap.Any("countResultType", fmt.Sprintf("%T", count)))
			return nil, 0, fmt.Errorf("failed to assert count result type for project chunk")
		}
		totalCount += int(countValue) // Add chunk count to total

		// --- Get actual jobs for this chunk (for later pagination) ---
		// Apply ordering (e.g., by creation date descending)
		// Pagination is applied *after* merging results for simplicity here.
		iter := baseQuery.OrderBy("createdAt", firestore.Desc).Documents(ctx)
		defer iter.Stop()

		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				r.logger.Error("Error iterating jobs for project chunk", zap.Strings("projectIds", chunk), zap.Error(err))
				return nil, 0, fmt.Errorf("failed to iterate jobs: %w", err)
			}

			var job core.Job
			if err := doc.DataTo(&job); err != nil {
				r.logger.Warn("Failed to decode job document", zap.String("docId", doc.Ref.ID), zap.Error(err))
				continue // Skip bad document
			}
			job.ID = doc.Ref.ID
			allJobs = append(allJobs, &job)
		}
	}

	// --- Apply Sorting and Pagination to combined results ---
	// This is inefficient for large offsets but simpler to implement than multi-query cursors.

	// Sort the combined results (ensure consistent order)
	// Example sort: by CreatedAt descending (already done by query, but good practice if merging unsorted results)
	// sort.Slice(allJobs, func(i, j int) bool {
	// 	 return allJobs[i].CreatedAt.After(allJobs[j].CreatedAt)
	// })

	// Apply manual pagination
	start := offset
	end := offset + limit
	if start < 0 {
		start = 0
	}
	if start >= len(allJobs) {
		return []*core.Job{}, totalCount, nil // Offset is beyond total items
	}
	if end > len(allJobs) {
		end = len(allJobs)
	}

	pagedJobs := allJobs[start:end]

	r.logger.Info("Listed jobs across projects", zap.Int("projectCount", len(projectIDs)), zap.Int("totalJobsFound", totalCount), zap.Int("returnedCount", len(pagedJobs)))
	return pagedJobs, totalCount, nil
}

// Helper function to chunk a slice
func chunkSlice(slice []string, chunkSize int) [][]string {
	var chunks [][]string
	for i := 0; i < len(slice); i += chunkSize {
		end := i + chunkSize
		if end > len(slice) {
			end = len(slice)
		}
		chunks = append(chunks, slice[i:end])
	}
	return chunks
}
