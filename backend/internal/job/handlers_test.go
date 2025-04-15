package job

import (
	"SynDataGen/backend/internal/auth" // For auth.UserIDKey
	"SynDataGen/backend/internal/core"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// --- Mock Job Service ---
// We redefine the interface methods needed by the handler here for mocking.
// Alternatively, import the service_test mocks if packages allow, but keeping it separate is often cleaner.
type MockJobService struct {
	mock.Mock
}

func (m *MockJobService) CreateJob(ctx context.Context, projectID, userID string, req CreateJobRequest) (*core.Job, error) {
	args := m.Called(ctx, projectID, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Job), args.Error(1)
}

func (m *MockJobService) SubmitJob(ctx context.Context, jobID, userID string) (*core.Job, error) {
	// Implementation not strictly needed for current handler tests, but good practice
	args := m.Called(ctx, jobID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Job), args.Error(1)
}

func (m *MockJobService) GetJobByID(ctx context.Context, jobID, userID string) (*core.Job, error) {
	args := m.Called(ctx, jobID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Job), args.Error(1)
}

func (m *MockJobService) ListJobsByProject(ctx context.Context, projectID, userID string, limit, offset int) ([]*core.Job, int, error) {
	args := m.Called(ctx, projectID, userID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*core.Job), args.Int(1), args.Error(2)
}

func (m *MockJobService) CancelJob(ctx context.Context, jobID, userID string) (*core.Job, error) {
	// Implementation not strictly needed for current handler tests
	args := m.Called(ctx, jobID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Job), args.Error(1)
}

func (m *MockJobService) SyncJobStatus(ctx context.Context, jobID, userID string) (*core.Job, error) {
	// Implementation not strictly needed for current handler tests
	args := m.Called(ctx, jobID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Job), args.Error(1)
}

// --- Helper to setup Gin test context ---
func setupGinTestRouter(handler *JobHandler) (*gin.Engine, *MockJobService) {
	gin.SetMode(gin.TestMode)
	router := gin.New() // Use gin.New() instead of gin.Default() for cleaner tests

	// Create a mock service specifically for this handler test scope
	mockService := new(MockJobService)
	handler.service = mockService // Inject the mock service into the handler

	// Mock auth middleware - just sets the user ID in context
	mockAuthMiddleware := func(c *gin.Context) {
		// Set a default user ID for tests unless overridden in the test case
		c.Set(auth.UserIDKey, "test-user-id")
		c.Next()
	}

	// Register routes using the handler's method
	// We don't need a base group prefix like "/api/v1" for isolated handler testing
	handler.RegisterRoutes(router.Group("/"), mockAuthMiddleware)

	return router, mockService
}

// --- Test Functions ---

func TestJobHandler_CreateJob(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	handler := NewJobHandler(nil) // Service will be injected by setupGinTestRouter
	router, mockService := setupGinTestRouter(handler)

	projectID := "proj-" + uuid.NewString()
	userID := "user-" + uuid.NewString()

	validReqBody := CreateJobRequest{
		ProjectID: projectID, // Match the path param
		JobType:   "HANDLER_TEST",
		JobConfig: `{"configKey": "configValue"}`,
	}

	mockCreatedJob := &core.Job{
		ID:        uuid.NewString(),
		ProjectID: projectID,
		UserID:    userID,
		JobType:   validReqBody.JobType,
		JobConfig: validReqBody.JobConfig,
		Status:    core.JobStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	t.Run("Success", func(t *testing.T) {
		// Reset mock for sub-test (important if setup is outside t.Run)
		// router, mockService = setupGinTestRouter(handler) // Re-setup if needed or reset mocks

		// Setup request body
		bodyBytes, _ := json.Marshal(validReqBody)
		reqBody := bytes.NewBuffer(bodyBytes)

		// Mock service call
		mockService.On("CreateJob", mock.Anything, userID, projectID, validReqBody).Return(mockCreatedJob, nil).Once()

		// Create request and recorder
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")
		// Manually set user ID in context for this request
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		// Perform request
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(http.StatusCreated, w.Code)

		var respJob core.Job
		err := json.Unmarshal(w.Body.Bytes(), &respJob)
		require.NoError(err)
		assert.Equal(mockCreatedJob.ID, respJob.ID)
		assert.Equal(mockCreatedJob.ProjectID, respJob.ProjectID)
		assert.Equal(mockCreatedJob.JobType, respJob.JobType)
		assert.Equal(mockCreatedJob.JobConfig, respJob.JobConfig) // Config should ideally be compared after unmarshalling if complex

		mockService.AssertExpectations(t)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		// Reset mock for sub-test
		// router, _ = setupGinTestRouter(handler)

		bodyBytes, _ := json.Marshal(validReqBody)
		reqBody := bytes.NewBuffer(bodyBytes)

		w := httptest.NewRecorder()
		// Request WITHOUT setting UserIDKey in context
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusUnauthorized, w.Code)
		assert.Contains(w.Body.String(), "User ID missing")
	})

	t.Run("BadRequest_InvalidJSON", func(t *testing.T) {
		// Reset mock for sub-test
		// router, _ = setupGinTestRouter(handler)

		reqBody := bytes.NewBufferString(`{"projectId": "abc", "jobType": "test", "jobConfig": "{invalid"}`) // Invalid JSON in config

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		assert.Contains(w.Body.String(), "Invalid request body")
	})

	t.Run("BadRequest_MissingField", func(t *testing.T) {
		// Reset mock for sub-test
		// router, _ = setupGinTestRouter(handler)

		invalidReq := CreateJobRequest{ProjectID: projectID, JobConfig: "{}"} // Missing JobType
		bodyBytes, _ := json.Marshal(invalidReq)
		reqBody := bytes.NewBuffer(bodyBytes)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		assert.Contains(w.Body.String(), "JobType") // Error should mention the missing field
		assert.Contains(w.Body.String(), "required")
	})

	t.Run("BadRequest_ProjectIDMismatch", func(t *testing.T) {
		// Reset mock for sub-test
		// router, _ = setupGinTestRouter(handler)

		mismatchedReq := validReqBody
		mismatchedReq.ProjectID = "different-project-id" // Mismatch path param
		bodyBytes, _ := json.Marshal(mismatchedReq)
		reqBody := bytes.NewBuffer(bodyBytes)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody) // Path uses projectID
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		assert.Contains(w.Body.String(), "Project ID mismatch")
	})

	t.Run("ServiceError_NotFound", func(t *testing.T) {
		// Reset mock for sub-test
		router, mockService = setupGinTestRouter(handler)

		bodyBytes, _ := json.Marshal(validReqBody)
		reqBody := bytes.NewBuffer(bodyBytes)

		mockService.On("CreateJob", mock.Anything, userID, projectID, validReqBody).Return(nil, core.ErrNotFound).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusNotFound, w.Code)
		assert.Contains(w.Body.String(), "Project not found")
		mockService.AssertExpectations(t)
	})

	t.Run("ServiceError_Forbidden", func(t *testing.T) {
		// Reset mock for sub-test
		router, mockService = setupGinTestRouter(handler)

		bodyBytes, _ := json.Marshal(validReqBody)
		reqBody := bytes.NewBuffer(bodyBytes)

		mockService.On("CreateJob", mock.Anything, userID, projectID, validReqBody).Return(nil, core.ErrForbidden).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusForbidden, w.Code)
		assert.Contains(w.Body.String(), "Forbidden")
		mockService.AssertExpectations(t)
	})

	t.Run("ServiceError_Internal", func(t *testing.T) {
		// Reset mock for sub-test
		router, mockService = setupGinTestRouter(handler)

		internalError := errors.New("db connection failed")
		bodyBytes, _ := json.Marshal(validReqBody)
		reqBody := bytes.NewBuffer(bodyBytes)

		mockService.On("CreateJob", mock.Anything, userID, projectID, validReqBody).Return(nil, internalError).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/jobs", reqBody)
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusInternalServerError, w.Code)
		assert.Contains(w.Body.String(), "Failed to create job")
		mockService.AssertExpectations(t)
	})

}

func TestJobHandler_GetJob(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	handler := NewJobHandler(nil) // Service will be injected by setupGinTestRouter
	router, mockService := setupGinTestRouter(handler)

	jobID := "job-" + uuid.NewString()
	userID := "user-" + uuid.NewString()

	mockJob := &core.Job{
		ID:        jobID,
		ProjectID: "proj-for-get-" + uuid.NewString(),
		UserID:    userID,
		Status:    core.JobStatusCompleted,
		JobType:   "GET_HANDLER_TEST",
		JobConfig: `{}`, // Use valid JSON for config
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	t.Run("Success", func(t *testing.T) {
		// Reset mocks if setupGinTestRouter is outside t.Run
		// router, mockService = setupGinTestRouter(handler)

		// Mock service call
		mockService.On("GetJobByID", mock.Anything, jobID, userID).Return(mockJob, nil).Once()

		// Create request and recorder
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/jobs/"+jobID, nil)
		// Manually set user ID in context for this request
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		// Perform request
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(http.StatusOK, w.Code)

		var respJob core.Job
		err := json.Unmarshal(w.Body.Bytes(), &respJob)
		require.NoError(err)
		assert.Equal(mockJob.ID, respJob.ID)
		assert.Equal(mockJob.ProjectID, respJob.ProjectID)
		assert.Equal(mockJob.Status, respJob.Status)
		assert.Equal(mockJob.JobConfig, respJob.JobConfig)

		mockService.AssertExpectations(t)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		// Reset mocks if needed
		// router, _ = setupGinTestRouter(handler)

		w := httptest.NewRecorder()
		// Request WITHOUT setting UserIDKey in context
		req, _ := http.NewRequest(http.MethodGet, "/jobs/"+jobID, nil)

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusUnauthorized, w.Code)
		assert.Contains(w.Body.String(), "User ID missing")
	})

	t.Run("ServiceError_NotFound", func(t *testing.T) {
		// Reset mocks if needed
		router, mockService = setupGinTestRouter(handler)

		mockService.On("GetJobByID", mock.Anything, jobID, userID).Return(nil, core.ErrNotFound).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/jobs/"+jobID, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusNotFound, w.Code)
		assert.Contains(w.Body.String(), "Job not found")
		mockService.AssertExpectations(t)
	})

	t.Run("ServiceError_Forbidden", func(t *testing.T) {
		// Reset mocks if needed
		router, mockService = setupGinTestRouter(handler)

		mockService.On("GetJobByID", mock.Anything, jobID, userID).Return(nil, core.ErrForbidden).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/jobs/"+jobID, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusForbidden, w.Code)
		assert.Contains(w.Body.String(), "Forbidden")
		mockService.AssertExpectations(t)
	})

	t.Run("ServiceError_Internal", func(t *testing.T) {
		// Reset mocks if needed
		router, mockService = setupGinTestRouter(handler)
		internalError := errors.New("internal service failure")

		mockService.On("GetJobByID", mock.Anything, jobID, userID).Return(nil, internalError).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/jobs/"+jobID, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusInternalServerError, w.Code)
		assert.Contains(w.Body.String(), "Failed to retrieve job")
		mockService.AssertExpectations(t)
	})
}

func TestJobHandler_ListJobsByProject(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	handler := NewJobHandler(nil) // Service will be injected by setupGinTestRouter
	router, mockService := setupGinTestRouter(handler)

	projectID := "proj-" + uuid.NewString()
	userID := "user-" + uuid.NewString()

	mockJobs := []*core.Job{
		{ID: "job-list-1", ProjectID: projectID, Status: core.JobStatusRunning},
		{ID: "job-list-2", ProjectID: projectID, Status: core.JobStatusCompleted},
	}
	mockTotal := 5

	t.Run("Success_DefaultPagination", func(t *testing.T) {
		// router, mockService = setupGinTestRouter(handler)
		defaultLimit := 20
		defaultOffset := 0

		// Mock service call with default pagination
		mockService.On("ListJobsByProject", mock.Anything, projectID, userID, defaultLimit, defaultOffset).Return(mockJobs, mockTotal, nil).Once()

		// Create request and recorder (no query params)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/projects/"+projectID+"/jobs", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		// Perform request
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(http.StatusOK, w.Code)

		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(err)

		assert.Equal(float64(mockTotal), resp["total"]) // JSON numbers are float64
		assert.Equal(float64(defaultLimit), resp["limit"])
		assert.Equal(float64(defaultOffset), resp["offset"])
		jobsResp, ok := resp["jobs"].([]interface{})
		require.True(ok)
		assert.Len(jobsResp, len(mockJobs))

		mockService.AssertExpectations(t)
	})

	t.Run("Success_CustomPagination", func(t *testing.T) {
		router, mockService = setupGinTestRouter(handler)
		limit := 5
		offset := 10

		// Mock service call with custom pagination
		mockService.On("ListJobsByProject", mock.Anything, projectID, userID, limit, offset).Return(mockJobs, mockTotal, nil).Once()

		w := httptest.NewRecorder()
		url := fmt.Sprintf("/projects/%s/jobs?limit=%d&offset=%d", projectID, limit, offset)
		req, _ := http.NewRequest(http.MethodGet, url, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))

		router.ServeHTTP(w, req)

		assert.Equal(http.StatusOK, w.Code)
		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(err)
		assert.Equal(float64(limit), resp["limit"])
		assert.Equal(float64(offset), resp["offset"])
		assert.Equal(float64(mockTotal), resp["total"])

		mockService.AssertExpectations(t)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		// router, _ = setupGinTestRouter(handler)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/projects/"+projectID+"/jobs", nil)
		// No user ID in context
		router.ServeHTTP(w, req)
		assert.Equal(http.StatusUnauthorized, w.Code)
		assert.Contains(w.Body.String(), "User ID missing")
	})

	t.Run("BadRequest_InvalidLimit", func(t *testing.T) {
		// router, _ = setupGinTestRouter(handler)
		w := httptest.NewRecorder()
		url := fmt.Sprintf("/projects/%s/jobs?limit=abc", projectID)
		req, _ := http.NewRequest(http.MethodGet, url, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		router.ServeHTTP(w, req)
		assert.Equal(http.StatusBadRequest, w.Code)
		assert.Contains(w.Body.String(), "Invalid 'limit'")
	})

	t.Run("BadRequest_InvalidOffset", func(t *testing.T) {
		// router, _ = setupGinTestRouter(handler)
		w := httptest.NewRecorder()
		url := fmt.Sprintf("/projects/%s/jobs?offset=-5", projectID)
		req, _ := http.NewRequest(http.MethodGet, url, nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		router.ServeHTTP(w, req)
		assert.Equal(http.StatusBadRequest, w.Code)
		assert.Contains(w.Body.String(), "Invalid 'offset'")
	})

	t.Run("ServiceError_NotFound", func(t *testing.T) {
		router, mockService = setupGinTestRouter(handler)
		mockService.On("ListJobsByProject", mock.Anything, projectID, userID, 20, 0).Return(nil, 0, core.ErrNotFound).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/projects/"+projectID+"/jobs", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusNotFound, w.Code)
		assert.Contains(w.Body.String(), "Project not found")
		mockService.AssertExpectations(t)
	})

	t.Run("ServiceError_Forbidden", func(t *testing.T) {
		router, mockService = setupGinTestRouter(handler)
		mockService.On("ListJobsByProject", mock.Anything, projectID, userID, 20, 0).Return(nil, 0, core.ErrForbidden).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/projects/"+projectID+"/jobs", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusForbidden, w.Code)
		assert.Contains(w.Body.String(), "Forbidden")
		mockService.AssertExpectations(t)
	})

	t.Run("ServiceError_Internal", func(t *testing.T) {
		router, mockService = setupGinTestRouter(handler)
		internalError := errors.New("db list error")
		mockService.On("ListJobsByProject", mock.Anything, projectID, userID, 20, 0).Return(nil, 0, internalError).Once()

		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/projects/"+projectID+"/jobs", nil)
		req = req.WithContext(context.WithValue(req.Context(), auth.UserIDKey, userID))
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusInternalServerError, w.Code)
		assert.Contains(w.Body.String(), "Failed to list jobs")
		mockService.AssertExpectations(t)
	})

}

// All handlers tested
