package job

import (
	"SynDataGen/backend/internal/core"
	"SynDataGen/backend/internal/project"
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// --- Mocks ---

// MockJobRepository is a mock implementation of core.JobRepository
type MockJobRepository struct {
	mock.Mock
}

func (m *MockJobRepository) CreateJob(ctx context.Context, job *core.Job) error {
	args := m.Called(ctx, job)
	// Simulate setting timestamps like the real repo
	if args.Error(0) == nil && job != nil {
		now := time.Now().UTC()
		job.CreatedAt = now
		job.UpdatedAt = now
	}
	return args.Error(0)
}

func (m *MockJobRepository) GetJobByID(ctx context.Context, jobID string) (*core.Job, error) {
	args := m.Called(ctx, jobID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Job), args.Error(1)
}

func (m *MockJobRepository) ListJobsByProjectID(ctx context.Context, projectID string, limit int, offset int) ([]*core.Job, int, error) {
	args := m.Called(ctx, projectID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*core.Job), args.Int(1), args.Error(2)
}

func (m *MockJobRepository) UpdateJobStatus(ctx context.Context, jobID string, newStatus core.JobStatus, pipelineJobID string, startedAt *time.Time, completedAt *time.Time, jobError string) error {
	args := m.Called(ctx, jobID, newStatus, pipelineJobID, startedAt, completedAt, jobError)
	return args.Error(0)
}

func (m *MockJobRepository) UpdateJobResult(ctx context.Context, jobID string, resultURI string) error {
	args := m.Called(ctx, jobID, resultURI)
	return args.Error(0)
}

// MockProjectService is a mock implementation of project.ProjectService
type MockProjectService struct {
	mock.Mock
}

func (m *MockProjectService) CreateProject(ctx context.Context, creatorID string, req project.CreateProjectRequest) (*core.Project, error) {
	args := m.Called(ctx, creatorID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

func (m *MockProjectService) GetProjectByID(ctx context.Context, projectID string, callerID string) (*core.Project, error) {
	args := m.Called(ctx, projectID, callerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

func (m *MockProjectService) ListProjects(ctx context.Context, userID string, statusFilter string, limit int, offset int) (*project.ListProjectsResponse, error) {
	args := m.Called(ctx, userID, statusFilter, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*project.ListProjectsResponse), args.Error(1)
}

func (m *MockProjectService) UpdateProject(ctx context.Context, projectID string, callerID string, req project.UpdateProjectRequest) (*core.Project, error) {
	args := m.Called(ctx, projectID, callerID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

func (m *MockProjectService) DeleteProject(ctx context.Context, projectID string, callerID string) error {
	args := m.Called(ctx, projectID, callerID)
	return args.Error(0)
}

// Add missing methods to satisfy the interface
func (m *MockProjectService) InviteMember(ctx context.Context, projectID string, callerID string, req project.InviteMemberRequest) (*core.Project, error) {
	args := m.Called(ctx, projectID, callerID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

func (m *MockProjectService) UpdateMemberRole(ctx context.Context, projectID string, callerID string, targetUserID string, newRole core.Role) (*core.Project, error) {
	args := m.Called(ctx, projectID, callerID, targetUserID, newRole)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

func (m *MockProjectService) RemoveMember(ctx context.Context, projectID string, callerID string, targetUserID string) (*core.Project, error) {
	args := m.Called(ctx, projectID, callerID, targetUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

// MockPipelineClient is a mock implementation of PipelineClient
type MockPipelineClient struct {
	mock.Mock
}

func (m *MockPipelineClient) Submit(ctx context.Context, jobConfig string, jobType string, projectID string) (pipelineJobID string, err error) {
	args := m.Called(ctx, jobConfig, jobType, projectID)
	return args.String(0), args.Error(1)
}

func (m *MockPipelineClient) CheckStatus(ctx context.Context, pipelineJobID string) (status core.JobStatus, errorMessage string, err error) {
	args := m.Called(ctx, pipelineJobID)
	statusVal, _ := args.Get(0).(core.JobStatus)
	return statusVal, args.String(1), args.Error(2)
}

func (m *MockPipelineClient) Cancel(ctx context.Context, pipelineJobID string) error {
	args := m.Called(ctx, pipelineJobID)
	return args.Error(0)
}

// --- Helper to create service with mocks ---
func setupTestService() (JobService, *MockJobRepository, *MockProjectService, *MockPipelineClient) {
	mockJobRepo := new(MockJobRepository)
	mockProjectSvc := new(MockProjectService)
	mockPipeline := new(MockPipelineClient)
	// Logger is no longer injected

	service := NewJobService(mockJobRepo, mockProjectSvc, mockPipeline)
	return service, mockJobRepo, mockProjectSvc, mockPipeline
}

// --- Test Functions ---

func TestJobService_CreateJob(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	projectID := "proj-" + uuid.NewString()
	ownerID := "user-owner-" + uuid.NewString()
	memberID := "user-member-" + uuid.NewString()
	viewerID := "user-viewer-" + uuid.NewString()
	strangerID := "user-stranger-" + uuid.NewString()

	req := CreateJobRequest{
		ProjectID: projectID, // This might be redundant now service gets it from path
		JobType:   "DATA_GEN",
		JobConfig: `{"records": 1000, "format": "csv"}`,
	}

	mockProject := &core.Project{
		ID:   projectID,
		Name: "Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	t.Run("Success_MemberCreates", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// Expect project access check via ProjectService.GetProjectByID
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// Expect job creation
		mockJobRepo.On("CreateJob", ctx, mock.MatchedBy(func(job *core.Job) bool {
			return job.ProjectID == projectID &&
				job.UserID == memberID && // Job created by member
				job.Status == core.JobStatusPending &&
				job.JobType == req.JobType &&
				job.JobConfig == req.JobConfig &&
				job.ID != ""
		})).Return(nil).Once()

		job, err := service.CreateJob(ctx, projectID, memberID, req)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(projectID, job.ProjectID)
		assert.Equal(memberID, job.UserID)
		assert.Equal(core.JobStatusPending, job.Status)
		assert.Equal(req.JobType, job.JobType)
		assert.Equal(req.JobConfig, job.JobConfig)
		assert.NotEmpty(job.ID)
		assert.NotZero(job.CreatedAt) // Should be set by mock
		assert.NotZero(job.UpdatedAt) // Should be set by mock

		mockProjectSvc.AssertExpectations(t)
		mockJobRepo.AssertExpectations(t)
	})

	t.Run("Success_OwnerCreates", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// Expect project access check via ProjectService.GetProjectByID
		mockProjectSvc.On("GetProjectByID", ctx, projectID, ownerID).Return(mockProject, nil).Once()
		// Expect job creation
		mockJobRepo.On("CreateJob", ctx, mock.AnythingOfType("*core.Job")).Return(nil).Once()

		job, err := service.CreateJob(ctx, projectID, ownerID, req)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(ownerID, job.UserID)

		mockProjectSvc.AssertExpectations(t)
		mockJobRepo.AssertExpectations(t)
	})

	t.Run("PermissionDenied_ViewerCannotCreate", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()

		// Expect project access check via ProjectService.GetProjectByID
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// CreateJob repo call should NOT be made

		job, err := service.CreateJob(ctx, projectID, viewerID, req)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrForbidden)
		assert.Contains(err.Error(), "Insufficient role")

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("PermissionDenied_StrangerCannotCreate", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()

		// Expect project access check to fail (ProjectService returns ErrForbidden)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, strangerID).Return(nil, project.ErrProjectAccessDenied).Once()

		job, err := service.CreateJob(ctx, projectID, strangerID, req)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectAccessDenied)
		assert.Contains(err.Error(), "project access check failed")

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()

		// Expect project access check to fail (ProjectService returns ErrNotFound)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(nil, project.ErrProjectNotFound).Once()

		job, err := service.CreateJob(ctx, projectID, memberID, req)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectNotFound)

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("GetProjectError", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()
		svcError := errors.New("project service internal error")

		// Expect project access check to fail (ProjectService returns generic error)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(nil, svcError).Once()

		job, err := service.CreateJob(ctx, projectID, memberID, req)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, svcError)

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("ValidationError_EmptyType", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()
		badReq := CreateJobRequest{JobConfig: req.JobConfig, JobType: ""} // Empty type

		// Expect project access check to succeed
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()

		job, err := service.CreateJob(ctx, projectID, memberID, badReq)

		require.Error(err)
		assert.Nil(job)
		assert.Contains(err.Error(), "job type cannot be empty")

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("ValidationError_EmptyConfig", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()
		badReq := CreateJobRequest{JobConfig: "", JobType: req.JobType} // Empty config

		// Expect project access check to succeed
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()

		job, err := service.CreateJob(ctx, projectID, memberID, badReq)

		require.Error(err)
		assert.Nil(job)
		assert.Contains(err.Error(), "job configuration cannot be empty")

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("RepositoryCreateError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		repoError := errors.New("failed to write to firestore")

		// Expect project access check
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// Expect job creation to fail
		mockJobRepo.On("CreateJob", ctx, mock.AnythingOfType("*core.Job")).Return(repoError).Once()

		job, err := service.CreateJob(ctx, projectID, memberID, req)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, repoError) // Service should wrap the error

		mockProjectSvc.AssertExpectations(t)
		mockJobRepo.AssertExpectations(t)
	})
}

func TestJobService_SubmitJob(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	jobID := "job-" + uuid.NewString()
	projectID := "proj-" + uuid.NewString()
	ownerID := "user-owner-" + uuid.NewString()
	memberID := "user-member-" + uuid.NewString()
	viewerID := "user-viewer-" + uuid.NewString()
	strangerID := "user-stranger-" + uuid.NewString()

	jobType := "SUBMIT_TEST"
	jobConfig := `{"param": "value"}`
	pipelineID := "pipe-" + uuid.NewString()

	mockJobPending := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		UserID:    memberID,              // Job created by a member
		Status:    core.JobStatusPending, // Correct status for submission
		JobType:   jobType,
		JobConfig: jobConfig,
		CreatedAt: time.Now().UTC().Add(-time.Minute),
		UpdatedAt: time.Now().UTC().Add(-time.Minute),
	}

	mockJobRunning := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		UserID:    memberID,
		Status:    core.JobStatusRunning, // Incorrect status
		JobType:   jobType,
		JobConfig: jobConfig,
		CreatedAt: time.Now().UTC().Add(-time.Minute),
		UpdatedAt: time.Now().UTC().Add(-time.Minute),
	}

	mockProject := &core.Project{
		ID:   projectID,
		Name: "Submit Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	t.Run("Success_MemberSubmits", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check (member submitting)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Expect pipeline submission
		mockPipeline.On("Submit", ctx, jobConfig, jobType, projectID).Return(pipelineID, nil).Once()
		// 4. Expect status update
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusRunning, pipelineID, mock.AnythingOfType("*time.Time"), (*time.Time)(nil), "").Return(nil).Once()

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusRunning, job.Status)
		assert.NotNil(job.StartedAt)
		assert.Equal(pipelineID, job.PipelineJobID)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("Success_OwnerSubmits", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check (owner submitting)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, ownerID).Return(mockProject, nil).Once()
		// 3. Expect pipeline submission
		mockPipeline.On("Submit", ctx, jobConfig, jobType, projectID).Return(pipelineID, nil).Once()
		// 4. Expect status update
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusRunning, pipelineID, mock.AnythingOfType("*time.Time"), (*time.Time)(nil), "").Return(nil).Once()

		job, err := service.SubmitJob(ctx, jobID, ownerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusRunning, job.Status)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("JobNotFound", func(t *testing.T) {
		service, mockJobRepo, _, _ := setupTestService()

		// 1. Expect GetJobByID to fail
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(nil, core.ErrNotFound).Once()

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrNotFound)

		mockJobRepo.AssertExpectations(t)
	})

	t.Run("PermissionDenied_ViewerCannotSubmit", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check (viewer submitting) - GetProjectByID succeeds but role check fails
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()

		job, err := service.SubmitJob(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrForbidden)
		assert.Contains(err.Error(), "Insufficient role")

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("PermissionDenied_StrangerCannotSubmit", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check to fail (ProjectService returns ErrForbidden)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, strangerID).Return(nil, project.ErrProjectAccessDenied).Once()

		job, err := service.SubmitJob(ctx, jobID, strangerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectAccessDenied)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("ProjectNotFoundForPermission", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check to fail (ProjectService returns ErrNotFound)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(nil, project.ErrProjectNotFound).Once()

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectNotFound)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("JobNotPending", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID (returns job with Running status)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		// 2. Expect project access check
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()

		// Pipeline and UpdateStatus should NOT be called

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.Error(err)
		assert.Nil(job) // Service returns nil on validation error before pipeline call
		assert.Contains(err.Error(), fmt.Sprintf("job %s cannot be submitted, status is %s", jobID, core.JobStatusRunning))

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("PipelineSubmitError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		pipelineError := errors.New("pipeline unavailable")

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Expect pipeline submission to fail
		mockPipeline.On("Submit", ctx, jobConfig, jobType, projectID).Return("", pipelineError).Once()
		// 4. Expect status update to FAILED because pipeline failed
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusFailed, "", (*time.Time)(nil), (*time.Time)(nil), fmt.Sprintf("Pipeline submission failed: %v", pipelineError)).Return(nil).Once()

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.Error(err)
		assert.ErrorIs(err, pipelineError) // Ensure original error is returned
		require.NotNil(job)                // Service returns the job struct even on pipeline error after updating status
		assert.Equal(core.JobStatusFailed, job.Status)
		assert.Contains(job.Error, "Pipeline submission failed")

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("PipelineSubmitError_UpdateStatusError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		pipelineError := errors.New("pipeline unavailable")
		updateError := errors.New("failed to update status in db")

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Expect pipeline submission to fail
		mockPipeline.On("Submit", ctx, jobConfig, jobType, projectID).Return("", pipelineError).Once()
		// 4. Expect status update to FAILED to also fail
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusFailed, "", (*time.Time)(nil), (*time.Time)(nil), fmt.Sprintf("Pipeline submission failed: %v", pipelineError)).Return(updateError).Once()

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.Error(err)
		assert.Nil(job) // Service returns nil if status update fails after pipeline error
		assert.ErrorIs(err, pipelineError)
		assert.Contains(err.Error(), "(and failed to update status)")

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("UpdateStatusErrorAfterSuccess", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		updateError := errors.New("db write failed")

		// 1. Expect GetJobByID
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Expect project access check
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Expect pipeline submission to succeed
		mockPipeline.On("Submit", ctx, jobConfig, jobType, projectID).Return(pipelineID, nil).Once()
		// 4. Expect status update to fail
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusRunning, pipelineID, mock.AnythingOfType("*time.Time"), (*time.Time)(nil), "").Return(updateError).Once()

		job, err := service.SubmitJob(ctx, jobID, memberID)

		require.Error(err)
		assert.ErrorIs(err, updateError)
		require.NotNil(job)
		assert.Equal(core.JobStatusPending, job.Status) // Status remains unchanged in returned struct
		assert.Contains(err.Error(), "failed to update local status")

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

}

func TestJobService_GetJobByID(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	jobID := "job-" + uuid.NewString()
	projectID := "proj-" + uuid.NewString()
	ownerID := "user-owner-" + uuid.NewString()
	memberID := "user-member-" + uuid.NewString()
	viewerID := "user-viewer-" + uuid.NewString()
	strangerID := "user-stranger-" + uuid.NewString()

	jobType := "GET_TEST"
	jobConfig := `{"detail": "info"}`

	mockJob := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		UserID:    memberID, // Job created by member
		Status:    core.JobStatusCompleted,
		JobType:   jobType,
		JobConfig: jobConfig,
		CreatedAt: time.Now().UTC().Add(-time.Hour),
		UpdatedAt: time.Now().UTC().Add(-time.Minute),
	}

	mockProject := &core.Project{
		ID:   projectID,
		Name: "Get Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	t.Run("Success_ViewerGets", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID from repo
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJob, nil).Once()
		// 2. Expect project access check (viewer getting)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()

		job, err := service.GetJobByID(ctx, jobID, viewerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(jobID, job.ID)
		assert.Equal(projectID, job.ProjectID)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("Success_MemberGets", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJob, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()

		job, err := service.GetJobByID(ctx, jobID, memberID)

		require.NoError(err)
		require.NotNil(job)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("JobNotFound", func(t *testing.T) {
		service, mockJobRepo, _, _ := setupTestService()

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(nil, core.ErrNotFound).Once()
		// Project check should not happen

		job, err := service.GetJobByID(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrNotFound)

		mockJobRepo.AssertExpectations(t)
	})

	t.Run("GetJobError", func(t *testing.T) {
		service, mockJobRepo, _, _ := setupTestService()
		repoError := errors.New("db connection error")

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(nil, repoError).Once()

		job, err := service.GetJobByID(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, repoError)

		mockJobRepo.AssertExpectations(t)
	})

	t.Run("PermissionDenied_StrangerCannotGet", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID from repo (succeeds)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJob, nil).Once()
		// 2. Expect project access check to fail
		mockProjectSvc.On("GetProjectByID", ctx, projectID, strangerID).Return(nil, project.ErrProjectAccessDenied).Once()

		job, err := service.GetJobByID(ctx, jobID, strangerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectAccessDenied)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("ProjectNotFoundForPermission", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect GetJobByID from repo (succeeds)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJob, nil).Once()
		// 2. Expect project access check to fail
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(nil, project.ErrProjectNotFound).Once()

		job, err := service.GetJobByID(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectNotFound)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("GetProjectErrorForPermission", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		projectSvcError := errors.New("project service internal error")

		// 1. Expect GetJobByID from repo (succeeds)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJob, nil).Once()
		// 2. Expect project access check to fail
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(nil, projectSvcError).Once()

		job, err := service.GetJobByID(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, projectSvcError)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

}

func TestJobService_ListJobsByProject(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	projectID := "proj-" + uuid.NewString()
	ownerID := "user-owner-" + uuid.NewString()
	memberID := "user-member-" + uuid.NewString()
	viewerID := "user-viewer-" + uuid.NewString()
	strangerID := "user-stranger-" + uuid.NewString()
	limit := 10
	offset := 0

	mockProject := &core.Project{
		ID:   projectID,
		Name: "List Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	mockJobs := []*core.Job{
		{ID: "job-1", ProjectID: projectID, Status: core.JobStatusCompleted},
		{ID: "job-2", ProjectID: projectID, Status: core.JobStatusRunning},
	}
	totalCount := 5

	t.Run("Success_ViewerLists", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Expect project access check (viewer listing)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// 2. Expect job listing from repo
		mockJobRepo.On("ListJobsByProjectID", ctx, projectID, limit, offset).Return(mockJobs, totalCount, nil).Once()

		jobs, count, err := service.ListJobsByProject(ctx, projectID, viewerID, limit, offset)

		require.NoError(err)
		assert.Equal(totalCount, count)
		assert.Equal(len(mockJobs), len(jobs))
		if len(jobs) > 0 && len(mockJobs) > 0 {
			assert.Equal(mockJobs[0].ID, jobs[0].ID)
		}

		mockProjectSvc.AssertExpectations(t)
		mockJobRepo.AssertExpectations(t)
	})

	t.Run("Success_MemberLists", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		mockJobRepo.On("ListJobsByProjectID", ctx, projectID, limit, offset).Return(mockJobs, totalCount, nil).Once()

		jobs, count, err := service.ListJobsByProject(ctx, projectID, memberID, limit, offset)

		require.NoError(err)
		assert.Equal(totalCount, count)
		assert.Equal(len(mockJobs), len(jobs))

		mockProjectSvc.AssertExpectations(t)
		mockJobRepo.AssertExpectations(t)
	})

	t.Run("PermissionDenied_StrangerCannotList", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()

		// 1. Expect project access check to fail
		mockProjectSvc.On("GetProjectByID", ctx, projectID, strangerID).Return(nil, project.ErrProjectAccessDenied).Once()
		// Job listing should not happen

		jobs, count, err := service.ListJobsByProject(ctx, projectID, strangerID, limit, offset)

		require.Error(err)
		assert.Nil(jobs)
		assert.Zero(count)
		assert.ErrorIs(err, project.ErrProjectAccessDenied)

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("ProjectNotFoundForPermission", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()

		// 1. Expect project access check to fail
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(nil, project.ErrProjectNotFound).Once()

		jobs, count, err := service.ListJobsByProject(ctx, projectID, viewerID, limit, offset)

		require.Error(err)
		assert.Nil(jobs)
		assert.Zero(count)
		assert.ErrorIs(err, project.ErrProjectNotFound)

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("GetProjectErrorForPermission", func(t *testing.T) {
		service, _, mockProjectSvc, _ := setupTestService()
		projectSvcError := errors.New("project service error")

		// 1. Expect project access check to fail
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(nil, projectSvcError).Once()

		jobs, count, err := service.ListJobsByProject(ctx, projectID, viewerID, limit, offset)

		require.Error(err)
		assert.Nil(jobs)
		assert.Zero(count)
		assert.ErrorIs(err, projectSvcError)

		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("JobRepositoryListError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		jobRepoError := errors.New("failed to list jobs")

		// 1. Expect project access check (success)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// 2. Expect job listing from repo to fail
		mockJobRepo.On("ListJobsByProjectID", ctx, projectID, limit, offset).Return(nil, 0, jobRepoError).Once()

		jobs, count, err := service.ListJobsByProject(ctx, projectID, viewerID, limit, offset)

		require.Error(err)
		assert.Nil(jobs)
		assert.Zero(count)
		assert.ErrorIs(err, jobRepoError)

		mockProjectSvc.AssertExpectations(t)
		mockJobRepo.AssertExpectations(t)
	})
}

func TestJobService_CancelJob(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	jobID := "job-" + uuid.NewString()
	projectID := "proj-" + uuid.NewString()
	ownerID := "user-owner-" + uuid.NewString()
	memberID := "user-member-" + uuid.NewString()
	viewerID := "user-viewer-" + uuid.NewString()
	strangerID := "user-stranger-" + uuid.NewString()
	pipelineID := "pipe-" + uuid.NewString()

	mockJobRunning := &core.Job{
		ID:            jobID,
		ProjectID:     projectID,
		UserID:        memberID,
		Status:        core.JobStatusRunning,
		PipelineJobID: pipelineID,
		StartedAt:     func() *time.Time { t := time.Now(); return &t }(), // Needs a non-nil StartedAt
	}
	mockJobPending := &core.Job{
		ID:            jobID,
		ProjectID:     projectID,
		UserID:        memberID,
		Status:        core.JobStatusPending,
		PipelineJobID: "", // Pending job, no pipeline ID yet
	}
	mockJobCompleted := &core.Job{
		ID:            jobID,
		ProjectID:     projectID,
		UserID:        memberID,
		Status:        core.JobStatusCompleted,
		PipelineJobID: pipelineID,
	}

	mockProject := &core.Project{
		ID:   projectID,
		Name: "Cancel Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	t.Run("Success_MemberCancelsRunningJob", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Get Job
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		// 2. Check Project Access (member cancelling)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Call Pipeline Cancel
		mockPipeline.On("Cancel", ctx, pipelineID).Return(nil).Once()
		// 4. Update Job Status
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCancelled, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), "Cancelled by user via pipeline request").Return(nil).Once()

		job, err := service.CancelJob(ctx, jobID, memberID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusCancelled, job.Status)
		assert.NotNil(job.CompletedAt)
		assert.Equal("Cancelled by user via pipeline request", job.Error)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("Success_OwnerCancelsRunningJob", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, ownerID).Return(mockProject, nil).Once()
		mockPipeline.On("Cancel", ctx, pipelineID).Return(nil).Once()
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCancelled, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), "Cancelled by user via pipeline request").Return(nil).Once()

		job, err := service.CancelJob(ctx, jobID, ownerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusCancelled, job.Status)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("Success_CancelPendingJob_NoPipelineCall", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Get Job (Pending, no pipeline ID)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPending, nil).Once()
		// 2. Check Project Access
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Pipeline Cancel should NOT be called
		// 4. Update Job Status
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCancelled, "", (*time.Time)(nil), mock.AnythingOfType("*time.Time"), "Cancelled by user before submission").Return(nil).Once()

		job, err := service.CancelJob(ctx, jobID, memberID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusCancelled, job.Status)
		assert.NotNil(job.CompletedAt)
		assert.Equal("Cancelled by user before submission", job.Error)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertNotCalled(t, "Cancel", mock.Anything, mock.Anything)
	})

	t.Run("JobNotFound", func(t *testing.T) {
		service, mockJobRepo, _, _ := setupTestService()
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(nil, core.ErrNotFound).Once()

		job, err := service.CancelJob(ctx, jobID, memberID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrNotFound)
		mockJobRepo.AssertExpectations(t)
	})

	t.Run("PermissionDenied_ViewerCannotCancel", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()

		job, err := service.CancelJob(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrForbidden)
		assert.Contains(err.Error(), "Insufficient role")
		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("PermissionDenied_StrangerCannotCancel", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, strangerID).Return(nil, project.ErrProjectAccessDenied).Once()

		job, err := service.CancelJob(ctx, jobID, strangerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectAccessDenied)
		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("JobNotCancellable", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobCompleted, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()

		job, err := service.CancelJob(ctx, jobID, memberID)

		require.Error(err)
		assert.Nil(job)
		assert.Contains(err.Error(), "cannot be cancelled")
		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("PipelineCancelError_StillUpdatesStatus", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		pipelineError := errors.New("pipeline cancel endpoint 500")
		expectedErrMsg := fmt.Sprintf("Cancelled by user; pipeline cancellation failed: %v", pipelineError)

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		mockPipeline.On("Cancel", ctx, pipelineID).Return(pipelineError).Once()
		// Update status should still be called, noting the pipeline error
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCancelled, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), expectedErrMsg).Return(nil).Once()

		job, err := service.CancelJob(ctx, jobID, memberID)

		require.NoError(err) // Service handles pipeline error internally for cancel, doesn't return it
		require.NotNil(job)
		assert.Equal(core.JobStatusCancelled, job.Status)
		assert.Equal(expectedErrMsg, job.Error) // Error message reflects pipeline issue
		assert.NotNil(job.CompletedAt)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("UpdateStatusError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		updateError := errors.New("db update failed")

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		mockPipeline.On("Cancel", ctx, pipelineID).Return(nil).Once()
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCancelled, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), "Cancelled by user via pipeline request").Return(updateError).Once()

		job, err := service.CancelJob(ctx, jobID, memberID)

		require.Error(err)
		assert.ErrorIs(err, updateError)
		require.NotNil(job)
		assert.Equal(core.JobStatusRunning, job.Status) // Status remains unchanged in returned struct

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})
}

func TestJobService_SyncJobStatus(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	jobID := "job-" + uuid.NewString()
	projectID := "proj-" + uuid.NewString()
	ownerID := "user-owner-" + uuid.NewString()
	memberID := "user-member-" + uuid.NewString()
	viewerID := "user-viewer-" + uuid.NewString()
	strangerID := "user-stranger-" + uuid.NewString()
	pipelineID := "pipe-" + uuid.NewString()

	mockJobRunning := &core.Job{
		ID:            jobID,
		ProjectID:     projectID,
		UserID:        memberID,
		Status:        core.JobStatusRunning,
		PipelineJobID: pipelineID,
		StartedAt:     func() *time.Time { t := time.Now(); return &t }(),
	}
	mockJobCompleted := &core.Job{
		ID:            jobID,
		ProjectID:     projectID,
		UserID:        memberID,
		Status:        core.JobStatusCompleted,
		PipelineJobID: pipelineID,
	}
	mockJobPendingNoPipelineID := &core.Job{
		ID:        jobID,
		ProjectID: projectID,
		UserID:    memberID,
		Status:    core.JobStatusPending,
	}

	mockProject := &core.Project{
		ID:   projectID,
		Name: "Sync Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	t.Run("Success_ViewerSyncs_StatusChangedToCompleted", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Get Job
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		// 2. Check Project Access (viewer syncing)
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// 3. Check Pipeline Status (returns Completed)
		mockPipeline.On("CheckStatus", ctx, pipelineID).Return(core.JobStatusCompleted, "", nil).Once()
		// 4. Update Job Status (because status changed)
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCompleted, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), "").Return(nil).Once()

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusCompleted, job.Status)
		assert.NotNil(job.CompletedAt)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("Success_MemberSyncs_StatusUnchanged", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Get Job
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		// 2. Check Project Access
		mockProjectSvc.On("GetProjectByID", ctx, projectID, memberID).Return(mockProject, nil).Once()
		// 3. Check Pipeline Status (returns Running)
		mockPipeline.On("CheckStatus", ctx, pipelineID).Return(core.JobStatusRunning, "", nil).Once()
		// Update Job Status should NOT be called

		job, err := service.SyncJobStatus(ctx, jobID, memberID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusRunning, job.Status)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
		mockJobRepo.AssertNotCalled(t, "UpdateJobStatus", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Success_StatusChangedToFailed", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		pipelineErrorMsg := "pipeline processing failed"

		// 1. Get Job
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		// 2. Check Project Access
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// 3. Check Pipeline Status (returns Failed with message)
		mockPipeline.On("CheckStatus", ctx, pipelineID).Return(core.JobStatusFailed, pipelineErrorMsg, nil).Once()
		// 4. Update Job Status
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusFailed, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), pipelineErrorMsg).Return(nil).Once()

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusFailed, job.Status)
		assert.NotNil(job.CompletedAt)
		assert.Equal(pipelineErrorMsg, job.Error)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("Skipped_AlreadyFinalState", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()

		// 1. Get Job (returns Completed)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobCompleted, nil).Once()
		// 2. Check Project Access
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// Pipeline Check and Update should NOT be called

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusCompleted, job.Status)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("Skipped_PendingNoPipelineID", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()

		// 1. Get Job (returns Pending, no PipelineID)
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobPendingNoPipelineID, nil).Once()
		// 2. Check Project Access
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		// Pipeline Check and Update should NOT be called

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.NoError(err)
		require.NotNil(job)
		assert.Equal(core.JobStatusPending, job.Status)

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertNotCalled(t, "CheckStatus", mock.Anything, mock.Anything)
	})

	t.Run("JobNotFound", func(t *testing.T) {
		service, mockJobRepo, _, _ := setupTestService()
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(nil, core.ErrNotFound).Once()

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, core.ErrNotFound)
		mockJobRepo.AssertExpectations(t)
	})

	t.Run("PermissionDenied_StrangerCannotSync", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, _ := setupTestService()
		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, strangerID).Return(nil, project.ErrProjectAccessDenied).Once()

		job, err := service.SyncJobStatus(ctx, jobID, strangerID)

		require.Error(err)
		assert.Nil(job)
		assert.ErrorIs(err, project.ErrProjectAccessDenied)
		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
	})

	t.Run("PipelineCheckStatusError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		pipelineError := errors.New("pipeline check status failed")

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		mockPipeline.On("CheckStatus", ctx, pipelineID).Return(core.JobStatus(""), "", pipelineError).Once()
		// Update status should NOT be called

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.Error(err)
		assert.ErrorIs(err, pipelineError)
		require.NotNil(job)
		assert.Equal(core.JobStatusRunning, job.Status) // Status remains unchanged

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})

	t.Run("UpdateStatusError", func(t *testing.T) {
		service, mockJobRepo, mockProjectSvc, mockPipeline := setupTestService()
		updateError := errors.New("db update failed")

		mockJobRepo.On("GetJobByID", ctx, jobID).Return(mockJobRunning, nil).Once()
		mockProjectSvc.On("GetProjectByID", ctx, projectID, viewerID).Return(mockProject, nil).Once()
		mockPipeline.On("CheckStatus", ctx, pipelineID).Return(core.JobStatusCompleted, "", nil).Once()
		mockJobRepo.On("UpdateJobStatus", ctx, jobID, core.JobStatusCompleted, pipelineID, mockJobRunning.StartedAt, mock.AnythingOfType("*time.Time"), "").Return(updateError).Once()

		job, err := service.SyncJobStatus(ctx, jobID, viewerID)

		require.Error(err)
		assert.ErrorIs(err, updateError)
		require.NotNil(job)
		assert.Equal(core.JobStatusRunning, job.Status) // Status remains unchanged

		mockJobRepo.AssertExpectations(t)
		mockProjectSvc.AssertExpectations(t)
		mockPipeline.AssertExpectations(t)
	})
}

// --- Authorization Helper Tests ---

func TestJobService_authorizeJobAction(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	projectID := "proj-auth-test-" + uuid.NewString()
	ownerID := "user-owner"
	adminID := "user-admin"
	memberID := "user-member"
	viewerID := "user-viewer"
	strangerID := "user-stranger"

	mockProject := &core.Project{
		ID:   projectID,
		Name: "Job Auth Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			adminID:  core.RoleAdmin,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	tests := []struct {
		name                        string
		userID                      string        // User performing the action
		requiredRole                core.Role     // Role needed for the action
		mockProjectSvcReturnProject *core.Project // Project returned by mock GetProjectByID
		mockProjectSvcReturnError   error         // Error returned by mock GetProjectByID
		expectedError               error         // Expected final error from authorizeJobAction (nil for success)
	}{
		// --- Success Cases ---
		{"Owner needs Owner", ownerID, core.RoleOwner, mockProject, nil, nil},
		{"Owner needs Admin", ownerID, core.RoleAdmin, mockProject, nil, nil},
		{"Owner needs Member", ownerID, core.RoleMember, mockProject, nil, nil},
		{"Owner needs Viewer", ownerID, core.RoleViewer, mockProject, nil, nil},

		{"Admin needs Admin", adminID, core.RoleAdmin, mockProject, nil, nil},
		{"Admin needs Member", adminID, core.RoleMember, mockProject, nil, nil},
		{"Admin needs Viewer", adminID, core.RoleViewer, mockProject, nil, nil},

		{"Member needs Member", memberID, core.RoleMember, mockProject, nil, nil},
		{"Member needs Viewer", memberID, core.RoleViewer, mockProject, nil, nil},

		{"Viewer needs Viewer", viewerID, core.RoleViewer, mockProject, nil, nil},

		// --- Failure Cases (Insufficient Role) ---
		{"Admin needs Owner", adminID, core.RoleOwner, mockProject, nil, core.ErrForbidden},
		{"Member needs Owner", memberID, core.RoleOwner, mockProject, nil, core.ErrForbidden},
		{"Viewer needs Owner", viewerID, core.RoleOwner, mockProject, nil, core.ErrForbidden},

		{"Member needs Admin", memberID, core.RoleAdmin, mockProject, nil, core.ErrForbidden},
		{"Viewer needs Admin", viewerID, core.RoleAdmin, mockProject, nil, core.ErrForbidden},

		{"Viewer needs Member", viewerID, core.RoleMember, mockProject, nil, core.ErrForbidden},

		// --- Failure Cases (Project Service Errors) ---
		{"Stranger tries Viewer (Access Denied)", strangerID, core.RoleViewer, nil, project.ErrProjectAccessDenied, project.ErrProjectAccessDenied},
		{"Member tries Viewer (Project Not Found)", memberID, core.RoleViewer, nil, project.ErrProjectNotFound, project.ErrProjectNotFound},
		{"Member tries Viewer (Project Service Error)", memberID, core.RoleViewer, nil, errors.New("firestore timeout"), errors.New("firestore timeout")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, _, mockProjectSvc, _ := setupTestService()

			// Setup mock project service expectation
			mockProjectSvc.On("GetProjectByID", ctx, projectID, tt.userID).Return(tt.mockProjectSvcReturnProject, tt.mockProjectSvcReturnError).Once()

			// Call the function under test
			actErr := service.(*jobService).authorizeJobAction(ctx, projectID, tt.userID, tt.requiredRole)

			// Assertions
			if tt.expectedError == nil {
				assert.NoError(actErr)
			} else {
				require.Error(actErr)
				// Use ErrorIs for checking specific sentinel errors, Contains for others if needed
				if errors.Is(tt.expectedError, core.ErrForbidden) || errors.Is(tt.expectedError, project.ErrProjectAccessDenied) || errors.Is(tt.expectedError, project.ErrProjectNotFound) {
					assert.ErrorIs(actErr, tt.expectedError)
				} else {
					// For generic errors, check if the underlying error matches
					assert.ErrorContains(actErr, tt.expectedError.Error())
				}
			}

			mockProjectSvc.AssertExpectations(t)
		})
	}
}

// All service methods tested
