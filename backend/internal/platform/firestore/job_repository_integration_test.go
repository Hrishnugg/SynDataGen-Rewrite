//go:build integration
// +build integration

package firestore

import (
	"context"
	"fmt"
	"log"
	"os"
	"testing"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/iterator"

	"SynDataGen/backend/internal/core" // Adjust if needed
)

const testFirestoreProjectID = "synoptic-test-project" // Arbitrary ID for emulator

// setupIntegrationTest connects to the Firestore emulator or skips the test.
func setupIntegrationTest(t *testing.T) (context.Context, *firestore.Client, func()) {
	t.Helper()
	emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST")
	if emulatorHost == "" {
		t.Skip("FIRESTORE_EMULATOR_HOST not set, skipping integration tests.")
	}

	ctx := context.Background()
	// Note: For emulator, credentials are not needed.
	client, err := firestore.NewClient(ctx, testFirestoreProjectID)
	require.NoError(t, err, "Failed to create Firestore client for emulator")

	// Teardown function to close the client
	teardown := func() {
		err := client.Close()
		assert.NoError(t, err, "Failed to close Firestore client")
	}

	return ctx, client, teardown
}

// cleanupFirestoreCollection deletes all documents in a given collection.
func cleanupFirestoreCollection(ctx context.Context, t *testing.T, client *firestore.Client, collectionName string) {
	t.Helper()
	ref := client.Collection(collectionName)
	batchSize := 100 // Firestore batch delete limit

	for {
		// Get a batch of documents
		iter := ref.Limit(batchSize).Documents(ctx)
		docs, err := iter.GetAll()
		if err != nil && err != iterator.Done {
			t.Fatalf("Failed to get documents for cleanup: %v", err)
		}
		if len(docs) == 0 {
			break // No more documents to delete
		}

		// Delete the documents in a batch
		batch := client.Batch()
		for _, doc := range docs {
			batch.Delete(doc.Ref)
		}
		_, err = batch.Commit(ctx)
		if err != nil {
			// Don't fail the test, but log the error
			t.Logf("Warning: Failed to commit batch delete during cleanup: %v", err)
			// Attempt to delete individually as a fallback (might be slow)
			for _, doc := range docs {
				_, delErr := doc.Ref.Delete(ctx)
				if delErr != nil {
					t.Logf("Warning: Failed individual delete during cleanup for doc %s: %v", doc.Ref.ID, delErr)
				}
			}
			// If individual delete also has issues, we might leave data behind,
			// but we avoid failing the test itself due to cleanup issues.
			break
		}
	}
	// t.Logf("Cleaned up collection: %s", collectionName)
}

// --- Integration Tests ---

func TestJobRepository_Integration_CreateAndGetJob(t *testing.T) {
	ctx, client, closeClient := setupIntegrationTest(t)
	defer closeClient()
	repo := NewJobRepository(client, log.Default()) // Use default logger for tests for now

	// Cleanup after test
	defer cleanupFirestoreCollection(ctx, t, client, jobCollection)

	// --- Test CreateJob ---
	jobID := uuid.NewString()
	projectID := "proj-" + uuid.NewString()
	now := time.Now().UTC().Truncate(time.Millisecond) // Truncate for comparison

	job := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		CreatedBy: "user-123",
		Status:    core.JobStatusPending,
		Type:      "DATA_GENERATION",
		Config:    map[string]interface{}{"param1": "value1", "count": 100},
		// CreatedAt and UpdatedAt are set by the repo
	}

	err := repo.CreateJob(ctx, job)
	require.NoError(t, err)

	// --- Test GetJobByID (Success) ---
	retrievedJob, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	require.NotNil(t, retrievedJob)

	// Assertions
	assert.Equal(t, jobID, retrievedJob.ID)
	assert.Equal(t, projectID, retrievedJob.ProjectID)
	assert.Equal(t, "user-123", retrievedJob.CreatedBy)
	assert.Equal(t, core.JobStatusPending, retrievedJob.Status)
	assert.Equal(t, "DATA_GENERATION", retrievedJob.Type)
	assert.Equal(t, map[string]interface{}{"param1": "value1", "count": float64(100)}, retrievedJob.Config) // Firestore converts numbers
	assert.WithinDuration(t, now, retrievedJob.CreatedAt, time.Second, "CreatedAt timestamp mismatch")
	assert.WithinDuration(t, retrievedJob.CreatedAt, retrievedJob.UpdatedAt, time.Millisecond, "UpdatedAt should initially match CreatedAt") // Should be very close
	assert.Empty(t, retrievedJob.PipelineJobID)
	assert.Nil(t, retrievedJob.StartedAt)
	assert.Nil(t, retrievedJob.CompletedAt)
	assert.Empty(t, retrievedJob.Error)
	assert.Empty(t, retrievedJob.ResultURI)

	// --- Test GetJobByID (Not Found) ---
	nonExistentID := uuid.NewString()
	notFoundJob, err := repo.GetJobByID(ctx, nonExistentID)
	require.Error(t, err)
	assert.Nil(t, notFoundJob)
	assert.ErrorIs(t, err, core.ErrNotFound, "Expected core.ErrNotFound for non-existent job")

	// --- Test CreateJob (Already Exists) ---
	// Try creating the same job again
	job.Config = map[string]interface{}{"param1": "value_new"} // Change something
	err = repo.CreateJob(ctx, job)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already exists", "Expected 'already exists' error")
	// Optionally check the gRPC status code if needed
	// st, ok := status.FromError(errors.Unwrap(err)) // May need deeper unwrapping depending on fmt.Errorf usage
	// require.True(t, ok, "Error should be a gRPC status error")
	// assert.Equal(t, codes.AlreadyExists, st.Code())

	// Verify the original job wasn't overwritten
	retrievedAgain, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	assert.Equal(t, map[string]interface{}{"param1": "value1", "count": float64(100)}, retrievedAgain.Config, "Job config should not have been updated")
}

func TestJobRepository_Integration_ListJobsByProjectID(t *testing.T) {
	ctx, client, closeClient := setupIntegrationTest(t)
	defer closeClient()
	repo := NewJobRepository(client, log.Default())

	// Cleanup after test
	defer cleanupFirestoreCollection(ctx, t, client, jobCollection)

	// --- Setup Data ---
	projectID1 := "list-proj-1"
	projectID2 := "list-proj-2"
	userID := "list-user-1"

	// Create jobs for projectID1 (newest first)
	jobTimes := []time.Time{
		time.Now().UTC().Add(-1 * time.Minute), // Oldest P1
		time.Now().UTC().Add(-2 * time.Minute),
		time.Now().UTC().Add(-3 * time.Minute),
		time.Now().UTC().Add(-4 * time.Minute),
		time.Now().UTC().Add(-5 * time.Minute), // Newest P1
	}
	jobIDsP1 := make([]string, len(jobTimes))
	for i, jobTime := range jobTimes {
		jobID := fmt.Sprintf("job-p1-%d", len(jobTimes)-i) // job-p1-5 (newest) ... job-p1-1 (oldest)
		jobIDsP1[i] = jobID
		job := &core.Job{
			ID:        jobID,
			ProjectID: projectID1,
			CreatedBy: userID,
			Status:    core.JobStatusPending,
			Type:      "LIST_TEST",
			Config:    map[string]interface{}{"index": i},
			CreatedAt: jobTime, // Set specific creation time for sorting test
			UpdatedAt: jobTime,
		}
		// Use direct client write for setup simplicity and specific timestamp control
		_, err := client.Collection(jobCollection).Doc(jobID).Set(ctx, job)
		require.NoError(t, err, "Failed to create test job %s", jobID)
	}
	// Reverse jobIDsP1 so index 0 is the newest (matches default query order)
	for i, j := 0, len(jobIDsP1)-1; i < j; i, j = i+1, j-1 {
		jobIDsP1[i], jobIDsP1[j] = jobIDsP1[j], jobIDsP1[i]
	}

	// Create jobs for projectID2
	jobIDP2_1 := "job-p2-1"
	jobP2_1 := &core.Job{ID: jobIDP2_1, ProjectID: projectID2, CreatedBy: userID, Status: core.JobStatusRunning, Type: "LIST_TEST_P2", CreatedAt: time.Now().UTC().Add(-10 * time.Minute), UpdatedAt: time.Now().UTC()}
	_, err := client.Collection(jobCollection).Doc(jobIDP2_1).Set(ctx, jobP2_1)
	require.NoError(t, err)

	jobIDP2_2 := "job-p2-2"
	jobP2_2 := &core.Job{ID: jobIDP2_2, ProjectID: projectID2, CreatedBy: userID, Status: core.JobStatusCompleted, Type: "LIST_TEST_P2", CreatedAt: time.Now().UTC().Add(-11 * time.Minute), UpdatedAt: time.Now().UTC()}
	_, err = client.Collection(jobCollection).Doc(jobIDP2_2).Set(ctx, jobP2_2)
	require.NoError(t, err)

	// --- Test Scenarios ---

	t.Run("ListAllForProject1", func(t *testing.T) {
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID1, 10, 0)
		require.NoError(t, err)
		assert.Equal(t, len(jobIDsP1), totalCount, "Total count mismatch")
		require.Len(t, jobs, len(jobIDsP1), "Returned jobs count mismatch")
		// Check order (newest first)
		for i := range jobIDsP1 {
			assert.Equal(t, jobIDsP1[i], jobs[i].ID, "Job order mismatch at index %d", i)
		}
	})

	t.Run("PaginationPage1", func(t *testing.T) {
		limit := 2
		offset := 0
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID1, limit, offset)
		require.NoError(t, err)
		assert.Equal(t, len(jobIDsP1), totalCount)
		require.Len(t, jobs, limit)
		assert.Equal(t, jobIDsP1[0], jobs[0].ID)
		assert.Equal(t, jobIDsP1[1], jobs[1].ID)
	})

	t.Run("PaginationPage2", func(t *testing.T) {
		limit := 2
		offset := 2
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID1, limit, offset)
		require.NoError(t, err)
		assert.Equal(t, len(jobIDsP1), totalCount)
		require.Len(t, jobs, limit)
		assert.Equal(t, jobIDsP1[2], jobs[0].ID)
		assert.Equal(t, jobIDsP1[3], jobs[1].ID)
	})

	t.Run("PaginationLastPage", func(t *testing.T) {
		limit := 2
		offset := 4
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID1, limit, offset)
		require.NoError(t, err)
		assert.Equal(t, len(jobIDsP1), totalCount)
		require.Len(t, jobs, 1) // Only 1 job left
		assert.Equal(t, jobIDsP1[4], jobs[0].ID)
	})

	t.Run("PaginationBeyondEnd", func(t *testing.T) {
		limit := 2
		offset := 6
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID1, limit, offset)
		require.NoError(t, err)
		assert.Equal(t, len(jobIDsP1), totalCount)
		require.Empty(t, jobs)
	})

	t.Run("ListForProject2", func(t *testing.T) {
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID2, 10, 0)
		require.NoError(t, err)
		assert.Equal(t, 2, totalCount)
		require.Len(t, jobs, 2)
		// Check order (newest first: job-p2-1 then job-p2-2)
		assert.Equal(t, jobIDP2_1, jobs[0].ID)
		assert.Equal(t, jobIDP2_2, jobs[1].ID)
	})

	t.Run("ListNonExistentProject", func(t *testing.T) {
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, "non-existent-project", 10, 0)
		require.NoError(t, err)
		assert.Equal(t, 0, totalCount)
		require.Empty(t, jobs)
	})

	t.Run("InvalidLimitOffsetDefaults", func(t *testing.T) {
		// Expect default limit (20) and offset (0)
		jobs, totalCount, err := repo.ListJobsByProjectID(ctx, projectID1, -1, -1)
		require.NoError(t, err)
		assert.Equal(t, len(jobIDsP1), totalCount)
		require.Len(t, jobs, len(jobIDsP1))      // Since total jobs < default limit
		assert.Equal(t, jobIDsP1[0], jobs[0].ID) // Check first job matches newest
	})
}

func TestJobRepository_Integration_UpdateJobStatus(t *testing.T) {
	ctx, client, closeClient := setupIntegrationTest(t)
	defer closeClient()
	repo := NewJobRepository(client, log.Default())

	// Cleanup after test
	defer cleanupFirestoreCollection(ctx, t, client, jobCollection)

	// --- Setup: Create an initial job ---
	jobID := uuid.NewString()
	projectID := "update-proj-1"
	initialJob := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		CreatedBy: "update-user",
		Status:    core.JobStatusPending,
		Type:      "UPDATE_TEST",
	}
	err := repo.CreateJob(ctx, initialJob)
	require.NoError(t, err, "Failed to create initial job for update test")

	// Get initial state to check timestamps later
	jobState0, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	initialUpdatedAt := jobState0.UpdatedAt
	time.Sleep(10 * time.Millisecond) // Ensure time progresses for UpdatedAt checks

	// --- Test Update to Running ---
	statusRunning := core.JobStatusRunning
	pipelineID1 := "pipe-run-123"
	startTime := time.Now().UTC().Truncate(time.Millisecond)

	err = repo.UpdateJobStatus(ctx, jobID, statusRunning, pipelineID1, &startTime, nil, "")
	require.NoError(t, err)

	jobState1, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	assert.Equal(t, statusRunning, jobState1.Status)
	assert.Equal(t, pipelineID1, jobState1.PipelineJobID)
	require.NotNil(t, jobState1.StartedAt)
	assert.WithinDuration(t, startTime, *jobState1.StartedAt, time.Millisecond)
	assert.True(t, jobState1.UpdatedAt.After(initialUpdatedAt), "UpdatedAt should have increased after RUNNING update")
	assert.Nil(t, jobState1.CompletedAt)
	assert.Empty(t, jobState1.Error)
	lastUpdatedAt := jobState1.UpdatedAt
	time.Sleep(10 * time.Millisecond)

	// --- Test Update to Failed ---
	statusFailed := core.JobStatusFailed
	completeTimeFail := time.Now().UTC().Truncate(time.Millisecond)
	errorMsg := "Something went wrong"

	err = repo.UpdateJobStatus(ctx, jobID, statusFailed, pipelineID1, nil, &completeTimeFail, errorMsg)
	require.NoError(t, err)

	jobState2, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	assert.Equal(t, statusFailed, jobState2.Status)
	assert.Equal(t, pipelineID1, jobState2.PipelineJobID) // Pipeline ID should persist
	require.NotNil(t, jobState2.StartedAt)                // Start time should persist
	assert.WithinDuration(t, startTime, *jobState2.StartedAt, time.Millisecond)
	require.NotNil(t, jobState2.CompletedAt)
	assert.WithinDuration(t, completeTimeFail, *jobState2.CompletedAt, time.Millisecond)
	assert.Equal(t, errorMsg, jobState2.Error)
	assert.True(t, jobState2.UpdatedAt.After(lastUpdatedAt), "UpdatedAt should have increased after FAILED update")
	lastUpdatedAt = jobState2.UpdatedAt
	time.Sleep(10 * time.Millisecond)

	// --- Test Update to Completed (should clear Error) ---
	statusCompleted := core.JobStatusCompleted
	completeTimeSuccess := time.Now().UTC().Truncate(time.Millisecond)

	// Update status, explicitly pass empty pipeline ID and error msg
	err = repo.UpdateJobStatus(ctx, jobID, statusCompleted, "", nil, &completeTimeSuccess, "")
	require.NoError(t, err)

	jobState3, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	assert.Equal(t, statusCompleted, jobState3.Status)
	assert.Equal(t, pipelineID1, jobState3.PipelineJobID) // Pipeline ID should persist even if empty string passed in update?
	// Let's refine this - pipelineJobID should probably NOT be cleared by UpdateJobStatus unless explicitly asked?
	// The current implementation only adds it if not empty. Let's check the UpdateJobStatus implementation again...
	// Okay, the implementation only adds pipelineJobID if the input string is non-empty. It doesn't clear it.
	// So, the pipelineID should still be pipelineID1.
	assert.Equal(t, pipelineID1, jobState3.PipelineJobID, "PipelineJobID should not be cleared by status update")

	require.NotNil(t, jobState3.StartedAt) // Start time persists
	assert.WithinDuration(t, startTime, *jobState3.StartedAt, time.Millisecond)
	require.NotNil(t, jobState3.CompletedAt)
	assert.WithinDuration(t, completeTimeSuccess, *jobState3.CompletedAt, time.Millisecond)
	assert.Empty(t, jobState3.Error, "Error field should be cleared when status is not Failed")
	assert.True(t, jobState3.UpdatedAt.After(lastUpdatedAt), "UpdatedAt should have increased after COMPLETED update")

	// --- Test Update Non-Existent Job ---
	nonExistentID := uuid.NewString()
	err = repo.UpdateJobStatus(ctx, nonExistentID, core.JobStatusRunning, "pipe-none", nil, nil, "")
	require.Error(t, err)
	assert.ErrorIs(t, err, core.ErrNotFound, "Expected core.ErrNotFound for non-existent job update")
}

func TestJobRepository_Integration_UpdateJobResult(t *testing.T) {
	ctx, client, closeClient := setupIntegrationTest(t)
	defer closeClient()
	repo := NewJobRepository(client, log.Default())

	// Cleanup after test
	defer cleanupFirestoreCollection(ctx, t, client, jobCollection)

	// --- Setup: Create an initial job ---
	jobID := uuid.NewString()
	projectID := "update-result-proj-1"
	initialJob := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		CreatedBy: "update-result-user",
		Status:    core.JobStatusCompleted, // Assume job is completed
		Type:      "UPDATE_RESULT_TEST",
	}
	err := repo.CreateJob(ctx, initialJob)
	require.NoError(t, err, "Failed to create initial job for update result test")

	// Get initial state to check timestamps later
	jobState0, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	initialUpdatedAt := jobState0.UpdatedAt
	time.Sleep(10 * time.Millisecond) // Ensure time progresses for UpdatedAt checks

	// --- Test Success Case ---
	resultURI := "gs://my-bucket/results/job-output.csv"
	err = repo.UpdateJobResult(ctx, jobID, resultURI)
	require.NoError(t, err)

	// Verify update
	jobState1, err := repo.GetJobByID(ctx, jobID)
	require.NoError(t, err)
	assert.Equal(t, resultURI, jobState1.ResultURI)
	assert.True(t, jobState1.UpdatedAt.After(initialUpdatedAt), "UpdatedAt should have increased after result update")
	assert.Equal(t, core.JobStatusCompleted, jobState1.Status) // Status should remain unchanged

	// --- Test Not Found Case ---
	nonExistentID := uuid.NewString()
	err = repo.UpdateJobResult(ctx, nonExistentID, "gs://some-other-uri")
	require.Error(t, err)
	assert.ErrorIs(t, err, core.ErrNotFound, "Expected core.ErrNotFound for non-existent job result update")
}

// TODO: Add tests for:
// - CreateJob (empty ID validation - although repo checks, better handled by service layer usually)

// func TestJobRepository_Integration_CreateJobEmptyID(t *testing.T) {
// 	// Implementation needed
// }
