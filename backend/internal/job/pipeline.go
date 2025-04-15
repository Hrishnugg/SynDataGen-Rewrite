package job

import (
	"SynDataGen/backend/internal/core"
	"context"
)

// PipelineClient defines the interface for interacting with the external data generation pipeline API.
type PipelineClient interface {
	// Submit sends a job configuration to the pipeline and returns the pipeline's unique identifier for the job.
	Submit(ctx context.Context, jobConfig string, jobType string, projectID string) (pipelineJobID string, err error)

	// CheckStatus queries the pipeline for the status of a specific job using the pipeline's job ID.
	// It should return a mapped core.JobStatus and any relevant error message from the pipeline.
	CheckStatus(ctx context.Context, pipelineJobID string) (status core.JobStatus, pipelineError string, err error)

	// Cancel sends a cancellation request to the pipeline for a specific job.
	Cancel(ctx context.Context, pipelineJobID string) error

	// TODO: Add methods for getting logs or results directly from the pipeline if needed.
}
