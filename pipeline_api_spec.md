openapi: 3.0.3
info:
  title: Data Generation Engine API (v2)
  description: |-
    Internal API for generating high-quality synthetic data (tabular, text, time series).
    Provides job management, status tracking, and webhook notifications.
    This specification covers the standardized v2 endpoints.
  version: '2.0.1'
servers:
  - url: / # Assuming service runs at the root
security:
  - OAuth2BearerAuth: [] # Default security for v2 endpoints

tags:
  - name: v2 - Jobs
    description: Manage data generation jobs (create, status, list, cancel, resume).
  - name: v2 - Webhooks
    description: Manage webhook registrations for job event notifications.
  - name: Health
    description: Service health checks.

paths:
  /health:
    get:
      tags:
        - Health
      summary: Consolidated Service Health Check
      description: Returns the health status of the service and its key components (application, pipeline, DB connection, etc.).
      operationId: getServiceHealthV2
      security: [] # Health checks typically don't require auth
      responses:
        '200':
          description: Service is healthy or degraded. Check component statuses.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServiceHealthResponse'
        '503':
          description: Service is unhealthy.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServiceHealthResponse'
        '500':
          description: Internal Server Error during health check aggregation.
          content:
            application/json:
              schema:
                # Using a simplified error structure here as it's a failure in the health check itself
                type: object
                properties:
                  error:
                    type: object
                    properties:
                      code: { type: string, example: "HEALTH_CHECK_FAILED" }
                      message: { type: string }
                      details: { type: object, description: "Details about the health check failure." }

  /api/v2/jobs:
    post:
      tags:
        - v2 - Jobs
      summary: Submit a new data generation job
      description: Creates and initiates a new data generation job using the unified v2 model. Requires authentication.
      operationId: createJobV2
      security:
        - OAuth2BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateJobRequest'
      responses:
        '202':
          description: Job accepted for asynchronous processing.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobCreationResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'
    get:
      tags:
        - v2 - Jobs
      summary: Get job history
      description: Returns the history of jobs for the authenticated user, with pagination and filtering. Requires authentication.
      operationId: getJobHistoryV2
      security:
        - OAuth2BearerAuth: []
      parameters:
        - name: limit
          in: query
          description: Maximum number of jobs to return
          schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
        - name: offset
          in: query
          description: Number of jobs to skip
          schema: { type: integer, default: 0, minimum: 0 }
        - name: status
          in: query
          description: Filter by job status
          schema: { $ref: '#/components/schemas/JobStatusEnum' }
        - name: start_date
          in: query
          description: Filter by start date (ISO 8601 format)
          schema: { type: string, format: date-time }
        - name: end_date
          in: query
          description: Filter by end date (ISO 8601 format)
          schema: { type: string, format: date-time }
      responses:
        '200':
          description: Job history retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobHistoryResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v2/jobs/{job_id}:
    get:
      tags:
        - v2 - Jobs
      summary: Get job status
      description: Returns the status and details of a specific job owned by the authenticated user. Requires authentication.
      operationId: getJobStatusV2
      security:
        - OAuth2BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/JobIdPath'
      responses:
        '200':
          description: Job status retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatusResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden' # Access denied to this job
        '404':
          $ref: '#/components/responses/NotFound' # Job ID not found
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v2/jobs/{job_id}/cancel:
    post:
      tags:
        - v2 - Jobs
      summary: Cancel a job
      description: Requests cancellation of a running or queued job owned by the authenticated user. Requires authentication.
      operationId: cancelJobV2
      security:
        - OAuth2BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/JobIdPath'
      responses:
        '200':
          description: Job cancellation request accepted and processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobActionResponse' # success: true
        '400':
           description: Cannot cancel job (e.g., already completed/failed, or other reason).
           content:
             application/json:
                schema:
                  $ref: '#/components/schemas/ErrorResponse' # Using standard error format
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v2/jobs/{job_id}/resume:
    post:
      tags:
        - v2 - Jobs
      summary: Resume a job
      description: Resumes a previously paused job owned by the authenticated user. Requires authentication.
      operationId: resumeJobV2
      security:
        - OAuth2BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/JobIdPath'
      responses:
        '200':
          description: Job resume request accepted and processed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobActionResponse' # success: true
        '400':
           description: Cannot resume job (e.g., not paused, or other reason).
           content:
             application/json:
                schema:
                  $ref: '#/components/schemas/ErrorResponse' # Using standard error format
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v2/webhooks/register:
    post:
      tags:
        - v2 - Webhooks
      summary: Register a new webhook
      description: Registers a new webhook for the authenticated user to receive notifications for specified job events. Requires authentication.
      operationId: registerWebhookV2
      security:
        - OAuth2BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebhookRegistrationRequest'
      responses:
        '201':
          description: Webhook registered successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookResponse'
        '400':
          $ref: '#/components/responses/BadRequest' # e.g., invalid event type, duplicate webhook
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v2/webhooks:
    get:
      tags:
        - v2 - Webhooks
      summary: List registered webhooks
      description: Lists all webhooks registered by the authenticated user, optionally filtering by event type. Secrets are omitted. Requires authentication.
      operationId: listWebhooksV2
      security:
        - OAuth2BearerAuth: []
      parameters:
        - name: event
          in: query
          required: false
          description: Filter webhooks by a specific event type.
          schema:
            $ref: '#/components/schemas/WebhookEventEnum'
      responses:
        '200':
          description: Webhooks listed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookListResponse' # Contains safe WebhookConfig objects
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v2/webhooks/{webhook_id}:
    delete:
      tags:
        - v2 - Webhooks
      summary: Delete a webhook
      description: Deletes a specific webhook registration by its ID for the authenticated user. Requires authentication.
      operationId: deleteWebhookV2
      security:
        - OAuth2BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/WebhookIdPath'
      responses:
        '200':
          description: Webhook deleted successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookResponse' # success: true
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden' # User doesn't own this webhook
        '404':
          $ref: '#/components/responses/NotFound' # Webhook ID not found
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  schemas:
    # --- Enums ---
    JobStageStatusEnum:
      type: string
      enum: [pending, processing, completed, failed, skipped]
      description: Status of a single stage within a job.
    JobStatusEnum:
      type: string
      enum: [queued, running, completed, failed, cancelled, paused, initialized]
      description: Overall status of a data generation job.
    WebhookEventEnum:
      type: string
      enum: ['job.created', 'job.updated', 'job.completed', 'job.failed']
      description: Event types that can be subscribed to via webhooks.
    ErrorCodeEnum:
      type: string
      enum:
        - JOB_SUBMISSION_FAILED
        - HISTORY_FETCH_FAILED
        - JOB_NOT_FOUND
        - INVALID_STATUS_FORMAT
        - ACCESS_DENIED
        - STATUS_FETCH_FAILED
        - CANCEL_FAILED
        - CANCEL_ERROR
        - RESUME_FAILED
        - RESUME_ERROR
        - VALIDATION_ERROR
        - WEBHOOK_REGISTRATION_FAILED
        - WEBHOOK_LIST_FAILED
        - WEBHOOK_NOT_FOUND
        - WEBHOOK_DELETION_FAILED
      description: Standardized machine-readable error codes for API v2.

    # --- Job Related Models (from src/models/pipeline.py) ---
    JobStage:
      type: object
      description: Represents a single stage within a data generation job pipeline.
      required: [name, status]
      properties:
        name: { type: string, description: "Name of the pipeline stage." }
        status: { $ref: '#/components/schemas/JobStageStatusEnum' }
        progress: { type: integer, default: 0, description: "Progress of this stage (0-100)." }
        start_time: { type: string, format: date-time, nullable: true, description: "Timestamp when the stage started processing." }
        end_time: { type: string, format: date-time, nullable: true, description: "Timestamp when the stage finished processing." }
        error: { type: object, additionalProperties: true, nullable: true, description: "Error details if the stage failed." }
    JobError:
      type: object
      description: Detailed error information if a job failed.
      required: [code, message]
      properties:
        code: { type: string, description: "Machine-readable error code." }
        message: { type: string, description: "Human-readable error message." }
    JobMetadata:
      type: object
      description: Metadata associated with a data generation job.
      properties:
        input_size: { type: integer, default: 0, description: "Size of the input data (e.g., bytes or row count)." }
        output_size: { type: integer, nullable: true, description: "Size of the generated output data." }
        processing_time: { type: integer, nullable: true, description: "Total processing time in seconds." }
        retry_count: { type: integer, default: 0, description: "Number of times the job has been retried." }
        expiration_date: { type: string, format: date-time, nullable: true, description: "Timestamp when job results might expire." }
    JobConfiguration:
      type: object
      description: Configuration parameters used to initiate a data generation job. Referenced within JobStatusResponse.
      required: [input_location, output_location, data_type, project_id]
      properties:
        input_location:
          type: object
          required: [bucket, path]
          properties:
            bucket: { type: string, description: "Storage bucket for input data." }
            path: { type: string, description: "Path within the bucket to the input data." }
        output_location:
          type: object
          required: [bucket, path]
          properties:
            bucket: { type: string, description: "Storage bucket for output data." }
            path: { type: string, description: "Path within the bucket for the output data." }
        data_type: { type: string, description: "Type of data being generated (e.g., 'tabular', 'text')." }
        project_id: { type: string, description: "Identifier for the project this job belongs to." }
        parameters: { type: object, additionalProperties: true, description: "Additional parameters specific to the pipeline or data type." }
        input_format: { type: string, default: "csv", description: "Format of the input data." }
    CreateJobRequest:
      type: object
      description: Request body for creating a new data generation job.
      required: [data_type, data_size, input_format, output_format, input_bucket, output_bucket, input_path, output_path, project_id]
      properties:
        data_type: { type: string, description: "Type of data to generate (e.g., 'tabular', 'text')." }
        data_size: { type: integer, description: "Target size/count of the dataset to generate.", minimum: 1 }
        input_format: { type: string, description: "Format of input data (e.g., CSV, JSON, Parquet)." }
        output_format: { type: string, description: "Desired format of output data." }
        input_bucket: { type: string, description: "Source bucket containing input/sample data." }
        output_bucket: { type: string, description: "Target bucket for generated data." }
        input_path: { type: string, description: "Path to input/sample data within the source bucket." }
        output_path: { type: string, description: "Path where generated data should be written in the target bucket." }
        is_async: { type: boolean, default: true, description: "Whether the job should be processed asynchronously." }
        timeout: { type: integer, default: 3600, minimum: 1, description: "Maximum allowed job runtime in seconds." }
        resume_window: { type: integer, default: 300, minimum: 1, description: "Time window (seconds) within which a paused job can be resumed." }
        parameters: { type: object, additionalProperties: true, description: "Additional pipeline-specific parameters (e.g., model config, constraints)." }
        project_id: { type: string, description: "Project identifier associated with this job request." }
    JobCreationResponse:
      type: object
      description: Response received after successfully submitting a job creation request.
      required: [job_id, status]
      properties:
        job_id: { type: string, format: uuid, description: "Unique identifier assigned to the newly created job." }
        status: { type: string, enum: [accepted, rejected], description: "Indicates if the job submission was accepted for processing or rejected." }
        message: { type: string, nullable: true, description: "Optional message providing more details about the submission status." }
    JobStatusResponse:
      type: object
      description: Detailed status information for a specific data generation job.
      required: [job_id, customer_id, project_id, status, progress, start_time, last_updated, stages, metadata, configuration]
      properties:
        job_id: { type: string, format: uuid }
        customer_id: { type: string, description: "Identifier of the customer who owns the job." }
        project_id: { type: string, description: "Identifier of the project the job belongs to." }
        status: { $ref: '#/components/schemas/JobStatusEnum' }
        progress: { type: integer, minimum: 0, maximum: 100, description: "Overall job progress percentage." }
        start_time: { type: string, format: date-time, description: "Timestamp when the job processing started." }
        end_time: { type: string, format: date-time, nullable: true, description: "Timestamp when the job finished (completed, failed, or cancelled)." }
        last_updated: { type: string, format: date-time, description: "Timestamp when the job status was last updated." }
        error: { $ref: '#/components/schemas/JobError', nullable: true }
        stages:
          type: array
          items:
            $ref: '#/components/schemas/JobStage'
          description: "List of stages involved in this job and their statuses."
        metadata: { $ref: '#/components/schemas/JobMetadata' }
        configuration: { $ref: '#/components/schemas/JobConfiguration', description: "The configuration used to run this job." }
    JobHistoryResponse:
       type: object
       description: Response containing a list of job statuses for a history query.
       required: [jobs, total]
       properties:
         jobs:
           type: array
           items:
             $ref: '#/components/schemas/JobStatusResponse'
           description: "List of job status details matching the query."
         total: { type: integer, description: "Total number of jobs matching the query criteria (ignoring pagination limit)." }
         next_offset: { type: integer, nullable: true, description: "Offset to use in the next query to get the following page of results, null if this is the last page." }
    JobActionResponse:
      type: object
      description: Standard response for actions like cancel or resume.
      required: [success]
      properties:
        success: { type: boolean, description: "Indicates whether the action was successfully processed." }
        message: { type: string, nullable: true, description: "Optional message providing details about the action's outcome." }

    # --- Webhook Related Models (from src/api/v2/webhooks/webhook_routes.py) ---
    WebhookRegistrationRequest:
      type: object
      description: Request body for registering a new webhook.
      required: [url, events, secret]
      properties:
        url: { type: string, format: url, description: "The HTTPS URL endpoint where webhook events should be sent." }
        events:
          type: array
          items: { $ref: '#/components/schemas/WebhookEventEnum' }
          minItems: 1
          uniqueItems: true
          description: "List of event types to subscribe to (e.g., 'job.completed')."
        secret: { type: string, format: password, description: "A secret string used to generate the webhook signature for verification. Keep this confidential." }
        headers: { type: object, additionalProperties: { type: string }, nullable: true, description: "Optional custom headers to include in webhook requests sent to the registered URL." }
    WebhookResponse:
      type: object
      description: Response for webhook registration or deletion operations.
      required: [success, message]
      properties:
        success: { type: boolean }
        message: { type: string }
        webhook_id: { type: string, format: uuid, nullable: true, description: "Unique identifier of the created/modified webhook (present on successful registration)." }
    WebhookConfigSafe: # Schema for listing webhooks (secret omitted)
      type: object
      description: Configuration of a registered webhook (secret is omitted for security).
      required: [url, events, customer_id, id]
      properties:
         id: { type: string, format: uuid, description: "Unique identifier of the webhook registration." }
         url: { type: string, format: url }
         events:
           type: array
           items: { $ref: '#/components/schemas/WebhookEventEnum' }
         customer_id: { type: string, description: "Identifier of the customer who owns this webhook." }
         headers: { type: object, additionalProperties: { type: string }, nullable: true }
    WebhookListResponse:
       type: object
       description: Response containing a list of registered webhooks for the user.
       required: [webhooks]
       properties:
         webhooks:
           type: array
           items:
             $ref: '#/components/schemas/WebhookConfigSafe'

    # --- Health Check Models (from src/api/v2/health/health_routes.py) ---
    ComponentStatus:
      type: object
      description: Health status of an individual service component.
      required: [name, status]
      properties:
        name: { type: string, description: "Name of the component (e.g., 'application', 'pipeline', 'database')." }
        status: { type: string, enum: [healthy, unhealthy, degraded], description: "Health status of the component." }
        message: { type: string, nullable: true, description: "Optional message providing more details about the component's status." }
        details: { type: object, additionalProperties: true, nullable: true, description: "Optional dictionary containing component-specific metrics or details." }
    ServiceHealthResponse:
      type: object
      description: Overall health status of the service, including component details.
      required: [overall_status, components]
      properties:
        overall_status: { type: string, enum: [healthy, unhealthy, degraded], description: "Aggregated health status of the entire service." }
        components:
          type: array
          items:
            $ref: '#/components/schemas/ComponentStatus'
          description: "List detailing the health status of individual components."

    # --- Common Error Schema ---
    ErrorDetail:
      type: object
      properties:
        field: { type: string, description: "Field related to the error, if applicable" }
        # Add other potential structured details here
    ErrorResponse:
      type: object
      description: Standard error response format.
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string, description: "A machine-readable error code string.", example: "JOB_NOT_FOUND" }
            message: { type: string, description: "A human-readable description of the error." }
            details: { type: object, additionalProperties: true, nullable: true, description: "Optional structured details about the error." }
            # Potentially add request_id, etc. here if standardized

  parameters:
    JobIdPath:
      name: job_id
      in: path
      required: true
      description: The unique identifier of the data generation job.
      schema:
        type: string
        format: uuid

  responses:
    BadRequest:
      description: Bad Request - The request payload is invalid or malformed (e.g., missing required fields, invalid data types, validation errors).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Unauthorized:
      description: Unauthorized - Authentication credentials missing or invalid.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Forbidden:
      description: Forbidden - Authentication successful, but the user does not have permission to access the requested resource or perform the action.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: Not Found - The requested resource (e.g., job, webhook) could not be found.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    InternalServerError:
      description: Internal Server Error - An unexpected error occurred on the server.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

  securitySchemes:
    OAuth2BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT # Assuming JWT, adjust if different
      description: |-
        Standard company OAuth2 machine-to-machine flow or user authentication.
        Use the format: `Authorization: Bearer {oauth-token}`.
        Obtain tokens via the company's auth service.
