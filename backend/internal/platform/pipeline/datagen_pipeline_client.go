package pipeline

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/job"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"go.uber.org/zap" // Assuming use of global logger
)

// --- DataGen Pipeline API v2 Specific Types (from OpenAPI spec) ---

type dataGenCreateJobRequest struct {
	DataType     string                 `json:"data_type"`
	DataSize     int                    `json:"data_size"` // Assuming size/count maps here
	InputFormat  string                 `json:"input_format"`
	OutputFormat string                 `json:"output_format"`
	InputBucket  string                 `json:"input_bucket"`
	OutputBucket string                 `json:"output_bucket"`
	InputPath    string                 `json:"input_path"`
	OutputPath   string                 `json:"output_path"`
	IsAsync      bool                   `json:"is_async"`
	Timeout      int                    `json:"timeout"`
	ResumeWindow int                    `json:"resume_window"`
	Parameters   map[string]interface{} `json:"parameters"`
	ProjectID    string                 `json:"project_id"`
}

type dataGenJobCreationResponse struct {
	JobID   string `json:"job_id"`
	Status  string `json:"status"` // "accepted" or "rejected"
	Message string `json:"message,omitempty"`
}

type dataGenJobStatusResponse struct {
	JobID       string            `json:"job_id"`
	CustomerID  string            `json:"customer_id"`
	ProjectID   string            `json:"project_id"`
	Status      string            `json:"status"` // e.g., "queued", "running", "completed"
	Progress    int               `json:"progress"`
	StartTime   *time.Time        `json:"start_time"`
	EndTime     *time.Time        `json:"end_time"`
	LastUpdated time.Time         `json:"last_updated"`
	Error       *dataGenJobError  `json:"error"`
	Stages      []dataGenJobStage `json:"stages"`
	// Metadata      *JobMetadata            `json:"metadata"` // Simplified for now
	// Configuration *JobConfiguration       `json:"configuration"` // Simplified for now
}

type dataGenJobError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type dataGenJobStage struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

type dataGenJobActionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// --- Client Implementation ---

// dataGenPipelineClient implements the job.PipelineClient interface
type dataGenPipelineClient struct {
	baseURL    string
	httpClient *http.Client
	logger     *zap.Logger
	// TODO: Add mechanism to obtain OAuth token (e.g., config, service)
	// tokenSource TokenSource
}

// Config holds configuration for the DataGen Pipeline Client.
type Config struct {
	BaseURL string // e.g., "http://datagen-pipeline.internal:8000"
	Timeout time.Duration
	Logger  *zap.Logger
	// TODO: Add configuration for authentication (e.g., token URL, credentials)
}

// NewDataGenPipelineClient creates a new client for the DataGen v2 API.
func NewDataGenPipelineClient(cfg Config) (job.PipelineClient, error) {
	if cfg.BaseURL == "" {
		return nil, fmt.Errorf("DataGen Pipeline API base URL is required")
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 30 * time.Second
	}
	if cfg.Logger == nil {
		cfg.Logger = zap.L() // Use global logger if none provided
	}

	// TODO: Initialize token source based on config

	return &dataGenPipelineClient{
		baseURL: cfg.BaseURL,
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
		},
		logger: cfg.Logger.Named("DataGenPipelineClient"),
		// tokenSource: initializedTokenSource,
	}, nil
}

// Submit sends a job configuration to the DataGen pipeline.
func (c *dataGenPipelineClient) Submit(ctx context.Context, jobConfig string, jobType string, projectID string) (string, error) {
	c.logger.Info("Submitting job to DataGen Pipeline", zap.String("projectID", projectID), zap.String("jobType", jobType))

	// 1. Parse jobConfig (assuming it's JSON) and map to dataGenCreateJobRequest
	// TODO: Implement robust parsing and mapping based on expected jobConfig structure
	// Example (needs significant refinement based on actual jobConfig details):
	var pipelineParams map[string]interface{}
	if err := json.Unmarshal([]byte(jobConfig), &pipelineParams); err != nil {
		c.logger.Error("Failed to parse jobConfig JSON", zap.Error(err))
		return "", fmt.Errorf("invalid jobConfig format: %w", err)
	}

	// TODO: Extract specific fields required by dataGenCreateJobRequest from pipelineParams
	// This requires knowing the exact structure of jobConfig passed from the service.
	// Placeholder values:
	reqPayload := dataGenCreateJobRequest{
		DataType:     jobType,          // Map from our jobType
		DataSize:     1000,             // Example: Needs to come from jobConfig
		InputFormat:  "csv",            // Example: Needs to come from jobConfig
		OutputFormat: "csv",            // Example: Needs to come from jobConfig
		InputBucket:  "input-bucket",   // Example: Needs context/config
		OutputBucket: "output-bucket",  // Example: Needs context/config (e.g., from project.Storage)
		InputPath:    "path/to/input",  // Example: Needs to come from jobConfig
		OutputPath:   "path/to/output", // Example: Needs to come from jobConfig
		ProjectID:    projectID,
		IsAsync:      true,
		Timeout:      3600,
		ResumeWindow: 300,
		Parameters:   pipelineParams, // Pass through other params
	}

	// 2. Prepare request body
	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		c.logger.Error("Failed to marshal DataGen request", zap.Error(err))
		return "", fmt.Errorf("failed to prepare request: %w", err)
	}

	// 3. Create HTTP request
	endpoint := fmt.Sprintf("%s/api/v2/jobs", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		c.logger.Error("Failed to create DataGen submit request", zap.Error(err))
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	// 4. Add Authentication Header
	// TODO: Implement token retrieval and add Authorization header
	// token, err := c.tokenSource.GetToken(ctx)
	// if err != nil {
	// 	 c.logger.Error("Failed to get auth token for DataGen API", zap.Error(err))
	// 	 return "", fmt.Errorf("authentication failed: %w", err)
	// }
	// req.Header.Set("Authorization", "Bearer " + token)
	req.Header.Set("Authorization", "Bearer TODO-REPLACE-ME") // Placeholder

	// 5. Execute Request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("Failed to execute DataGen submit request", zap.Error(err))
		return "", fmt.Errorf("failed to submit job to pipeline: %w", err)
	}
	defer resp.Body.Close()

	// 6. Handle Response
	bodyBytes, _ := io.ReadAll(resp.Body)       // Read body for logging/errors
	if resp.StatusCode != http.StatusAccepted { // Expect 202 Accepted
		c.logger.Error("DataGen API returned non-202 status on submit",
			zap.Int("status", resp.StatusCode),
			zap.String("response", string(bodyBytes)),
		)
		return "", fmt.Errorf("pipeline API error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var creationResp dataGenJobCreationResponse
	if err := json.Unmarshal(bodyBytes, &creationResp); err != nil {
		c.logger.Error("Failed to unmarshal DataGen submit response", zap.Error(err), zap.String("response", string(bodyBytes)))
		return "", fmt.Errorf("failed to parse pipeline response: %w", err)
	}

	if creationResp.Status != "accepted" {
		return "", fmt.Errorf("pipeline rejected job submission: %s", creationResp.Message)
	}

	c.logger.Info("Job successfully submitted to DataGen Pipeline", zap.String("pipelineJobID", creationResp.JobID))
	return creationResp.JobID, nil
}

// CheckStatus queries the DataGen pipeline for the status of a specific job.
func (c *dataGenPipelineClient) CheckStatus(ctx context.Context, pipelineJobID string) (core.JobStatus, string, error) {
	c.logger.Debug("Checking job status with DataGen Pipeline", zap.String("pipelineJobID", pipelineJobID))

	// 1. Create HTTP request
	endpoint := fmt.Sprintf("%s/api/v2/jobs/%s", c.baseURL, url.PathEscape(pipelineJobID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		c.logger.Error("Failed to create DataGen status request", zap.Error(err))
		return "", "", fmt.Errorf("failed to create status request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	// 2. Add Authentication Header
	// TODO: Implement token retrieval and add Authorization header
	req.Header.Set("Authorization", "Bearer TODO-REPLACE-ME") // Placeholder

	// 3. Execute Request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("Failed to execute DataGen status request", zap.Error(err))
		return "", "", fmt.Errorf("failed to check pipeline status: %w", err)
	}
	defer resp.Body.Close()

	// 4. Handle Response
	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		c.logger.Error("DataGen API returned non-200 status on status check",
			zap.Int("status", resp.StatusCode),
			zap.String("pipelineJobID", pipelineJobID),
			zap.String("response", string(bodyBytes)),
		)
		// TODO: Handle 404 Not Found specifically?
		return "", "", fmt.Errorf("pipeline API error (%d) checking status: %s", resp.StatusCode, string(bodyBytes))
	}

	var statusResp dataGenJobStatusResponse
	if err := json.Unmarshal(bodyBytes, &statusResp); err != nil {
		c.logger.Error("Failed to unmarshal DataGen status response", zap.Error(err), zap.String("response", string(bodyBytes)))
		return "", "", fmt.Errorf("failed to parse pipeline status response: %w", err)
	}

	// 5. Map status and error message
	coreStatus := mapPipelineStatusToCoreStatus(statusResp.Status)
	pipelineErrorMsg := ""
	if statusResp.Error != nil {
		pipelineErrorMsg = statusResp.Error.Message
	}

	c.logger.Debug("DataGen Pipeline status retrieved", zap.String("pipelineJobID", pipelineJobID), zap.String("pipelineStatus", statusResp.Status), zap.String("coreStatus", string(coreStatus)))
	return coreStatus, pipelineErrorMsg, nil
}

// Cancel sends a cancellation request to the DataGen pipeline.
func (c *dataGenPipelineClient) Cancel(ctx context.Context, pipelineJobID string) error {
	c.logger.Info("Requesting job cancellation from DataGen Pipeline", zap.String("pipelineJobID", pipelineJobID))

	// 1. Create HTTP request (POST request to /cancel endpoint)
	endpoint := fmt.Sprintf("%s/api/v2/jobs/%s/cancel", c.baseURL, url.PathEscape(pipelineJobID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil) // No body for cancel
	if err != nil {
		c.logger.Error("Failed to create DataGen cancel request", zap.Error(err))
		return fmt.Errorf("failed to create cancel request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	// 2. Add Authentication Header
	// TODO: Implement token retrieval and add Authorization header
	req.Header.Set("Authorization", "Bearer TODO-REPLACE-ME") // Placeholder

	// 3. Execute Request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("Failed to execute DataGen cancel request", zap.Error(err))
		return fmt.Errorf("failed to cancel job via pipeline: %w", err)
	}
	defer resp.Body.Close()

	// 4. Handle Response
	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		c.logger.Error("DataGen API returned non-200 status on cancel request",
			zap.Int("status", resp.StatusCode),
			zap.String("pipelineJobID", pipelineJobID),
			zap.String("response", string(bodyBytes)),
		)
		// TODO: Handle 400 Bad Request (e.g., already completed) specifically?
		return fmt.Errorf("pipeline API error (%d) cancelling job: %s", resp.StatusCode, string(bodyBytes))
	}

	// Optional: Check response body for success field if needed
	var actionResp dataGenJobActionResponse
	if err := json.Unmarshal(bodyBytes, &actionResp); err == nil {
		if !actionResp.Success {
			return fmt.Errorf("pipeline indicated cancellation failed: %s", actionResp.Message)
		}
	} else {
		c.logger.Warn("Could not parse cancel response body, assuming success based on 200 OK", zap.Error(err))
	}

	c.logger.Info("Job cancellation request sent successfully to DataGen Pipeline", zap.String("pipelineJobID", pipelineJobID))
	return nil
}

// Helper function to map pipeline status strings to internal core.JobStatus enum
func mapPipelineStatusToCoreStatus(pipelineStatus string) core.JobStatus {
	switch pipelineStatus {
	case "queued", "initialized": // Treat 'initialized' like 'queued' or 'pending'?
		return core.JobStatusPending // Or map 'queued' specifically if needed
	case "running":
		return core.JobStatusRunning
	case "completed":
		return core.JobStatusCompleted
	case "failed":
		return core.JobStatusFailed
	case "cancelled":
		return core.JobStatusCancelled
	case "paused":
		// Need to decide how to map 'paused' - perhaps back to Pending or Running?
		// Or add a Paused status to core.JobStatus if relevant to our system.
		return core.JobStatusRunning // Example: Treat paused as still technically running from our perspective
	default:
		// Log unknown status and return a default (e.g., Failed)
		zap.L().Warn("Unknown status received from DataGen Pipeline", zap.String("pipelineStatus", pipelineStatus))
		return core.JobStatusFailed // Default to Failed for safety
	}
}
