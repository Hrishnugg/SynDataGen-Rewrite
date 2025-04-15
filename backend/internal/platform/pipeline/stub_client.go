package pipeline

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/job" // Import the job package to use the interface
)

// stubPipelineClient implements the job.PipelineClient interface with stub logic.
type stubPipelineClient struct {
	logger *log.Logger
	// Store job statuses in memory for basic state simulation (optional)
	jobStates map[string]core.JobStatus
}

// NewStubPipelineClient creates a new stub pipeline client.
func NewStubPipelineClient(logger *log.Logger) job.PipelineClient {
	if logger == nil {
		logger = log.Default()
	}
	logger.Println("Initialized Stub Pipeline Client")
	return &stubPipelineClient{
		logger:    logger,
		jobStates: make(map[string]core.JobStatus),
	}
}

// Submit simulates sending a job to the pipeline.
func (s *stubPipelineClient) Submit(ctx context.Context, jobConfig string, jobType string, projectID string) (string, error) {
	pipelineJobID := uuid.NewString() // Generate a fake pipeline ID
	s.logger.Printf("[StubPipeline] Received Submit request for project %s, type %s. Assigned pipeline Job ID: %s", projectID, jobType, pipelineJobID)

	// Simulate initial state
	s.jobStates[pipelineJobID] = core.JobStatusPending

	// Simulate potential immediate failure (optional, for testing)
	// if rand.Intn(10) == 0 {
	// 	 s.logger.Printf("[StubPipeline] Simulating immediate submission failure for %s", pipelineJobID)
	// 	 s.jobStates[pipelineJobID] = core.JobStatusFailed
	// 	 return "", fmt.Errorf("stub pipeline simulation: immediate submission failure")
	// }

	s.logger.Printf("[StubPipeline] Job %s accepted (simulated). Initial status: %s", pipelineJobID, core.JobStatusPending)
	return pipelineJobID, nil
}

// CheckStatus simulates checking the status of a job in the pipeline.
func (s *stubPipelineClient) CheckStatus(ctx context.Context, pipelineJobID string) (core.JobStatus, string, error) {
	s.logger.Printf("[StubPipeline] Received CheckStatus request for pipeline Job ID: %s", pipelineJobID)

	currentStatus, exists := s.jobStates[pipelineJobID]
	if !exists {
		s.logger.Printf("[StubPipeline] Job %s not found (simulated).", pipelineJobID)
		return "", "", fmt.Errorf("stub pipeline simulation: job %s not found", pipelineJobID)
	}

	// Simple state progression simulation (can be made more complex)
	var nextStatus core.JobStatus
	var pipelineError string
	switch currentStatus {
	case core.JobStatusPending:
		nextStatus = core.JobStatusRunning
	case core.JobStatusRunning:
		// Randomly complete or fail
		if time.Now().Second()%3 == 0 { // Fail roughly 1/3 of the time
			nextStatus = core.JobStatusFailed
			pipelineError = "Stub simulation: random failure during processing."
		} else {
			nextStatus = core.JobStatusCompleted
		}
	case core.JobStatusCompleted:
		nextStatus = core.JobStatusCompleted // Stay completed
	case core.JobStatusFailed:
		nextStatus = core.JobStatusFailed // Stay failed
		pipelineError = "Stub simulation: job previously failed."
	case core.JobStatusCancelled:
		nextStatus = core.JobStatusCancelled // Stay cancelled
	default:
		nextStatus = currentStatus // No change for unknown states
	}

	if nextStatus != currentStatus {
		s.logger.Printf("[StubPipeline] Simulating status change for job %s: %s -> %s", pipelineJobID, currentStatus, nextStatus)
		s.jobStates[pipelineJobID] = nextStatus
	}

	s.logger.Printf("[StubPipeline] Current simulated status for job %s: %s", pipelineJobID, nextStatus)
	return nextStatus, pipelineError, nil
}

// Cancel simulates sending a cancellation request.
func (s *stubPipelineClient) Cancel(ctx context.Context, pipelineJobID string) error {
	s.logger.Printf("[StubPipeline] Received Cancel request for pipeline Job ID: %s", pipelineJobID)

	currentStatus, exists := s.jobStates[pipelineJobID]
	if !exists {
		s.logger.Printf("[StubPipeline] Job %s not found for cancellation (simulated).", pipelineJobID)
		// Depending on requirements, this might not be an error if the job is already gone
		return fmt.Errorf("stub pipeline simulation: job %s not found for cancel", pipelineJobID)
	}

	// Only allow cancellation if pending or running
	if currentStatus == core.JobStatusPending || currentStatus == core.JobStatusRunning {
		s.logger.Printf("[StubPipeline] Simulating cancellation for job %s (status was %s).", pipelineJobID, currentStatus)
		s.jobStates[pipelineJobID] = core.JobStatusCancelled
		return nil
	}

	s.logger.Printf("[StubPipeline] Cannot cancel job %s, status is already %s (simulated).", pipelineJobID, currentStatus)
	// Return an error indicating it cannot be cancelled in its current state
	return fmt.Errorf("stub pipeline simulation: job %s cannot be cancelled in status %s", pipelineJobID, currentStatus)
}
