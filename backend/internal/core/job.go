package core

import "time"

// JobStatus defines the possible states of a data generation job.
type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
	JobStatusCancelled JobStatus = "cancelled"
)

// Job represents a data generation job instance.
type Job struct {
	ID            string     `firestore:"id,omitempty" json:"id"`                                 // Unique job identifier (e.g., UUID)
	ProjectID     string     `firestore:"projectId" json:"projectId"`                             // ID of the project this job belongs to
	UserID        string     `firestore:"userId" json:"userId"`                                   // ID of the user who created the job
	Status        JobStatus  `firestore:"status" json:"status"`                                   // Current status of the job
	JobType       string     `firestore:"jobType" json:"jobType"`                                 // Type of data generation (e.g., 'csv', 'json', 'sql')
	JobConfig     string     `firestore:"jobConfig" json:"jobConfig"`                             // Configuration for the job (e.g., JSON string defining schema, rows)
	CreatedAt     time.Time  `firestore:"createdAt" json:"createdAt"`                             // Timestamp when the job was created
	UpdatedAt     time.Time  `firestore:"updatedAt" json:"updatedAt"`                             // Timestamp when the job was last updated
	PipelineJobID string     `firestore:"pipelineJobId,omitempty" json:"pipelineJobId,omitempty"` // External pipeline's ID for this job
	StartedAt     *time.Time `firestore:"startedAt,omitempty" json:"startedAt,omitempty"`         // Timestamp when the job started processing
	CompletedAt   *time.Time `firestore:"completedAt,omitempty" json:"completedAt,omitempty"`     // Timestamp when the job finished (successfully or failed)
	ResultURI     string     `firestore:"resultUri,omitempty" json:"resultUri,omitempty"`         // URI pointing to the generated data artifact (e.g., GCS path)
	Error         string     `firestore:"error,omitempty" json:"error,omitempty"`                 // Error message if the job failed
}
