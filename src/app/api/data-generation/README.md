# Data Generation API

This directory contains the API endpoints for the data generation system.

## Authentication

All endpoints require authentication. You must include a valid authentication token in the request headers.

## Endpoints

### Jobs

#### Create a Job

```
POST /api/data-generation/jobs
```

Request body:
```json
{
  "dataType": "string",
  "dataSize": 1000,
  "inputFormat": "CSV",
  "outputFormat": "CSV",
  "inputBucket": "input-bucket",
  "outputBucket": "output-bucket",
  "inputPath": "input/path",
  "outputPath": "output/path",
  "isAsync": true,
  "timeout": 3600,
  "resumeWindow": 300,
  "parameters": {},
  "projectId": "project-id"
}
```

Response:
```json
{
  "jobId": "job-id"
}
```

#### Get Job History

```
GET /api/data-generation/jobs
```

Query parameters:
- `limit` - Maximum number of jobs to return (default: 10)
- `offset` - Number of jobs to skip (default: 0)
- `status` - Filter by job status (`queued`, `running`, `completed`, `failed`, `cancelled`, `paused`)
- `startDate` - Filter by start date (ISO 8601 format)
- `endDate` - Filter by end date (ISO 8601 format)

Response:
```json
{
  "jobs": [
    {
      "jobId": "job-id",
      "status": "running",
      "progress": 50,
      "startTime": "2023-01-01T00:00:00Z",
      "lastUpdated": "2023-01-01T00:01:00Z",
      "stages": [
        {
          "name": "stage1",
          "status": "completed",
          "startTime": "2023-01-01T00:00:00Z",
          "endTime": "2023-01-01T00:00:30Z",
          "progress": 100
        },
        {
          "name": "stage2",
          "status": "running",
          "startTime": "2023-01-01T00:00:30Z",
          "progress": 50
        }
      ],
      "metadata": {
        "inputSize": 1024,
        "retryCount": 0
      },
      "configuration": {
        "dataType": "string",
        "dataSize": 1000,
        "inputFormat": "CSV",
        "outputFormat": "CSV",
        "inputBucket": "input-bucket",
        "outputBucket": "output-bucket",
        "inputPath": "input/path",
        "outputPath": "output/path",
        "isAsync": true,
        "timeout": 3600,
        "resumeWindow": 300,
        "parameters": {}
      }
    }
  ]
}
```

#### Get Job Status

```
GET /api/data-generation/jobs/{jobId}
```

Response:
```json
{
  "jobId": "job-id",
  "status": "running",
  "progress": 50,
  "startTime": "2023-01-01T00:00:00Z",
  "lastUpdated": "2023-01-01T00:01:00Z",
  "stages": [
    {
      "name": "stage1",
      "status": "completed",
      "startTime": "2023-01-01T00:00:00Z",
      "endTime": "2023-01-01T00:00:30Z",
      "progress": 100
    },
    {
      "name": "stage2",
      "status": "running",
      "startTime": "2023-01-01T00:00:30Z",
      "progress": 50
    }
  ],
  "metadata": {
    "inputSize": 1024,
    "retryCount": 0
  },
  "configuration": {
    "dataType": "string",
    "dataSize": 1000,
    "inputFormat": "CSV",
    "outputFormat": "CSV",
    "inputBucket": "input-bucket",
    "outputBucket": "output-bucket",
    "inputPath": "input/path",
    "outputPath": "output/path",
    "isAsync": true,
    "timeout": 3600,
    "resumeWindow": 300,
    "parameters": {}
  }
}
```

#### Cancel a Job

```
DELETE /api/data-generation/jobs/{jobId}
```

Response:
```json
{
  "success": true
}
```

#### Resume a Job

```
POST /api/data-generation/jobs/{jobId}?action=resume
```

Response:
```json
{
  "success": true
}
```

### Rate Limits

#### Get Rate Limit Status

```
GET /api/data-generation/rate-limits
```

Response:
```json
{
  "customerId": "customer-id",
  "currentJobs": 2,
  "maxJobs": 5,
  "cooldownPeriod": 45,
  "cooldownJobs": [
    {
      "jobId": "job-id",
      "cooldownUntil": "2023-01-01T00:01:45Z"
    }
  ]
}
```

### Retention Policies

#### Get Retention Policy

```
GET /api/data-generation/retention
```

Response:
```json
{
  "retentionDays": 180
}
```

#### Update Retention Policy

```
PUT /api/data-generation/retention
```

Request body:
```json
{
  "retentionDays": 90
}
```

Response:
```json
{
  "success": true,
  "retentionDays": 90
}
```

### Pipeline Health

#### Get Pipeline Health

```
GET /api/data-generation/health
```

Response:
```json
{
  "status": "healthy",
  "message": "Pipeline is running normally",
  "metrics": {
    "activeJobs": 2,
    "completedJobs": 10,
    "failedJobs": 1,
    "averageProcessingTimeMs": 5000
  },
  "timestamp": "2023-01-01T00:00:00Z"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- 200/201: Success
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid authentication)
- 403: Forbidden (not authorized to access the resource)
- 404: Not Found (resource not found)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error (server error)
- 503: Service Unavailable (pipeline is unhealthy) 