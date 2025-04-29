package project

import (
	"SynDataGen/backend/internal/auth"
	"SynDataGen/backend/internal/core"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// --- Mock Project Service ---
// Ensure this mock implements the *full* ProjectService interface
type MockProjectService struct {
	mock.Mock
}

// Implement all methods from ProjectService interface
func (m *MockProjectService) CreateProject(ctx context.Context, creatorID string, req CreateProjectRequest) (*core.Project, error) {
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

func (m *MockProjectService) ListProjects(ctx context.Context, userID string, statusFilter string, limit int, offset int) (*ListProjectsResponse, error) {
	args := m.Called(ctx, userID, statusFilter, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*ListProjectsResponse), args.Error(1)
}

func (m *MockProjectService) UpdateProject(ctx context.Context, projectID string, callerID string, req UpdateProjectRequest) (*core.Project, error) {
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

func (m *MockProjectService) InviteMember(ctx context.Context, projectID string, callerID string, req InviteMemberRequest) (*core.Project, error) {
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

// MockAuthService - Define a basic mock if one doesn't exist in auth package tests
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(ctx context.Context, name, email, password, company string) (*core.User, error) {
	// Implement if needed for other tests, otherwise can be minimal
	args := m.Called(ctx, name, email, password, company)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.User), args.Error(1)
}
func (m *MockAuthService) Login(ctx context.Context, email, password string) (sessionToken string, user *core.User, err error) {
	args := m.Called(ctx, email, password)
	return args.String(0), args.Get(1).(*core.User), args.Error(2)
}
func (m *MockAuthService) Logout(ctx context.Context, sessionToken string) error {
	args := m.Called(ctx, sessionToken)
	return args.Error(0)
}
func (m *MockAuthService) ValidateSession(ctx context.Context, sessionToken string) (userID string, err error) {
	args := m.Called(ctx, sessionToken)
	return args.String(0), args.Error(1)
}
func (m *MockAuthService) GetUserFromSession(ctx context.Context, sessionToken string) (*core.User, error) {
	args := m.Called(ctx, sessionToken)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.User), args.Error(1)
}

// Add missing method to satisfy interface (even if not used by current tests)
func (m *MockAuthService) GetCurrentUser(ctx context.Context) (*core.User, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.User), args.Error(1)
}

// --- Helper to setup Gin test context ---

// Refactored setup helper
func setupProjectHandlersTestRouter() (*gin.Engine, *MockProjectService) {
	gin.SetMode(gin.TestMode)

	mockAuthMiddleware := func(c *gin.Context) {
		if _, exists := c.Get(auth.UserIDKey); !exists {
			c.Set(auth.UserIDKey, "test-caller-id")
		}
		c.Next()
	}

	router := gin.New()
	mockService := new(MockProjectService)
	mockStorageService := new(MockStorageService)
	h := NewProjectHandlers(mockService, mockStorageService)

	protectedRoutes := router.Group("/projects")
	protectedRoutes.Use(mockAuthMiddleware)
	{
		protectedRoutes.POST("", h.CreateProject)
		protectedRoutes.GET("", h.ListProjects)
		protectedRoutes.GET("/:projectId", h.GetProject)
		protectedRoutes.PATCH("/:projectId", h.UpdateProject)
		protectedRoutes.DELETE("/:projectId", h.DeleteProject)

		teamRoutes := protectedRoutes.Group("/:projectId/team")
		{
			teamRoutes.POST("", h.InviteMember)
			teamRoutes.PUT("/:memberId", h.UpdateTeamMemberRole)
			teamRoutes.DELETE("/:memberId", h.RemoveTeamMember)
		}
	}

	return router, mockService
}

// --- Helper type for error responses ---
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// --- Test Functions ---

// (Tests for existing handlers: Create, List, Get, Update, Delete should go here if not present)

func TestInviteMemberHandler(t *testing.T) {
	router, mockService := setupProjectHandlersTestRouter()
	assert := assert.New(t)
	require := require.New(t)

	projectID := "project-123"
	callerID := "test-caller-id"
	targetUserID := "user-to-invite-456"

	t.Run("Success", func(t *testing.T) {
		inviteReq := InviteMemberRequest{UserID: targetUserID, Role: core.RoleViewer}
		expectedProject := &core.Project{
			ID:   projectID,
			Name: "Test Project",
			TeamMembers: map[string]core.Role{
				callerID:     core.RoleAdmin,
				targetUserID: core.RoleViewer,
			},
		}

		mockService.On("InviteMember", mock.Anything, projectID, callerID, inviteReq).Return(expectedProject, nil).Once()

		body, _ := json.Marshal(inviteReq)
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/team", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusOK, w.Code)
		var responseProject core.Project
		err := json.Unmarshal(w.Body.Bytes(), &responseProject)
		require.NoError(err)
		assert.Equal(expectedProject.ID, responseProject.ID)
		assert.Contains(responseProject.TeamMembers, targetUserID)
		assert.Equal(core.RoleViewer, responseProject.TeamMembers[targetUserID])
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Service Error (User Not Found)", func(t *testing.T) {
		inviteReq := InviteMemberRequest{UserID: targetUserID, Role: core.RoleMember}
		serviceErr := fmt.Errorf("user with ID %s not found", targetUserID)

		mockService.On("InviteMember", mock.Anything, projectID, callerID, inviteReq).Return(nil, serviceErr).Once()

		body, _ := json.Marshal(inviteReq)
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/team", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusNotFound, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("USER_NOT_FOUND", errResp.Error)
		assert.Contains(errResp.Message, serviceErr.Error())
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Service Error (Already Member)", func(t *testing.T) {
		inviteReq := InviteMemberRequest{UserID: targetUserID, Role: core.RoleMember}
		serviceErr := fmt.Errorf("user %s is already a member of this project", targetUserID)

		mockService.On("InviteMember", mock.Anything, projectID, callerID, inviteReq).Return(nil, serviceErr).Once()

		body, _ := json.Marshal(inviteReq)
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/team", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("INVITE_MEMBER_FAILED", errResp.Error)
		assert.Contains(errResp.Message, serviceErr.Error())
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Invalid Input (Bad Role Enum)", func(t *testing.T) {
		invalidInviteJSON := `{"userId": "` + targetUserID + `", "role": "owner"}`

		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/team", strings.NewReader(invalidInviteJSON))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("INVALID_INPUT", errResp.Error)
		assert.Contains(errResp.Message, "oneof=admin member viewer")
	})

	t.Run("Failure - Invalid JSON", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/team", strings.NewReader(`{invalid`))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
	})

	t.Run("Failure - Access Denied", func(t *testing.T) {
		inviteReq := InviteMemberRequest{UserID: targetUserID, Role: core.RoleViewer}
		serviceErr := ErrProjectAccessDenied

		mockService.On("InviteMember", mock.Anything, projectID, callerID, inviteReq).Return(nil, serviceErr).Once()

		body, _ := json.Marshal(inviteReq)
		req, _ := http.NewRequest(http.MethodPost, "/projects/"+projectID+"/team", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusForbidden, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("ACCESS_DENIED", errResp.Error)
		assert.Equal(serviceErr.Error(), errResp.Message)
		mockService.AssertExpectations(t)
	})
}

func TestUpdateMemberRoleHandler(t *testing.T) {
	router, mockService := setupProjectHandlersTestRouter()
	assert := assert.New(t)
	require := require.New(t)

	projectID := "project-abc"
	callerID := "test-caller-id"
	targetUserID := "member-to-update-xyz"
	newRole := core.RoleMember

	t.Run("Success", func(t *testing.T) {
		updateReq := UpdateMemberRoleRequest{Role: newRole}
		expectedProject := &core.Project{
			ID:   projectID,
			Name: "Updated Project",
			TeamMembers: map[string]core.Role{
				callerID:     core.RoleAdmin,
				targetUserID: newRole,
			},
		}

		mockService.On("UpdateMemberRole", mock.Anything, projectID, callerID, targetUserID, newRole).Return(expectedProject, nil).Once()

		body, _ := json.Marshal(updateReq)
		req, _ := http.NewRequest(http.MethodPut, "/projects/"+projectID+"/team/"+targetUserID, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusOK, w.Code)
		var responseProject core.Project
		err := json.Unmarshal(w.Body.Bytes(), &responseProject)
		require.NoError(err)
		assert.Equal(newRole, responseProject.TeamMembers[targetUserID])
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Service Error (Access Denied)", func(t *testing.T) {
		updateReq := UpdateMemberRoleRequest{Role: newRole}
		serviceErr := ErrProjectAccessDenied

		mockService.On("UpdateMemberRole", mock.Anything, projectID, callerID, targetUserID, newRole).Return(nil, serviceErr).Once()

		body, _ := json.Marshal(updateReq)
		req, _ := http.NewRequest(http.MethodPut, "/projects/"+projectID+"/team/"+targetUserID, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusForbidden, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("ACCESS_DENIED", errResp.Error)
		assert.Equal(serviceErr.Error(), errResp.Message)
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Service Error (Cannot Change Owner)", func(t *testing.T) {
		updateReq := UpdateMemberRoleRequest{Role: core.RoleAdmin}
		serviceErr := fmt.Errorf("cannot change the role of the project owner")

		mockService.On("UpdateMemberRole", mock.Anything, projectID, callerID, targetUserID, updateReq.Role).Return(nil, serviceErr).Once()

		body, _ := json.Marshal(updateReq)
		req, _ := http.NewRequest(http.MethodPut, "/projects/"+projectID+"/team/"+targetUserID, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("UPDATE_MEMBER_FAILED", errResp.Error)
		assert.Equal(serviceErr.Error(), errResp.Message)
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Invalid Role in Body (Binding Error)", func(t *testing.T) {
		invalidUpdateJSON := `{"role": "owner"}`

		req, _ := http.NewRequest(http.MethodPut, "/projects/"+projectID+"/team/"+targetUserID, strings.NewReader(invalidUpdateJSON))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("INVALID_INPUT", errResp.Error)
		assert.Contains(errResp.Message, "oneof=admin member viewer")
	})

	t.Run("Failure - Invalid JSON", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPut, "/projects/"+projectID+"/team/"+targetUserID, strings.NewReader(`{invalid`))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
	})
}

func TestRemoveMemberHandler(t *testing.T) {
	router, mockService := setupProjectHandlersTestRouter()
	assert := assert.New(t)
	require := require.New(t)

	projectID := "project-def"
	callerID := "test-caller-id"
	targetUserID := "member-to-remove-123"

	t.Run("Success", func(t *testing.T) {
		expectedProject := &core.Project{
			ID:   projectID,
			Name: "Project After Removal",
			TeamMembers: map[string]core.Role{
				callerID: core.RoleAdmin,
			},
		}

		mockService.On("RemoveMember", mock.Anything, projectID, callerID, targetUserID).Return(expectedProject, nil).Once()

		req, _ := http.NewRequest(http.MethodDelete, "/projects/"+projectID+"/team/"+targetUserID, nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusOK, w.Code)
		var responseProject core.Project
		err := json.Unmarshal(w.Body.Bytes(), &responseProject)
		require.NoError(err)
		_, exists := responseProject.TeamMembers[targetUserID]
		assert.False(exists, "Target user ID should not exist in team members map after removal")
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Service Error (Cannot Remove Owner)", func(t *testing.T) {
		serviceErr := fmt.Errorf("project owner cannot be removed")

		mockService.On("RemoveMember", mock.Anything, projectID, callerID, targetUserID).Return(nil, serviceErr).Once()

		req, _ := http.NewRequest(http.MethodDelete, "/projects/"+projectID+"/team/"+targetUserID, nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusBadRequest, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("REMOVE_MEMBER_FAILED", errResp.Error)
		assert.Equal(serviceErr.Error(), errResp.Message)
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Service Error (Access Denied)", func(t *testing.T) {
		serviceErr := ErrProjectAccessDenied

		mockService.On("RemoveMember", mock.Anything, projectID, callerID, targetUserID).Return(nil, serviceErr).Once()

		req, _ := http.NewRequest(http.MethodDelete, "/projects/"+projectID+"/team/"+targetUserID, nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusForbidden, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("ACCESS_DENIED", errResp.Error)
		assert.Equal(serviceErr.Error(), errResp.Message)
		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Project Not Found", func(t *testing.T) {
		serviceErr := ErrProjectNotFound

		mockService.On("RemoveMember", mock.Anything, projectID, callerID, targetUserID).Return(nil, serviceErr).Once()

		req, _ := http.NewRequest(http.MethodDelete, "/projects/"+projectID+"/team/"+targetUserID, nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(http.StatusNotFound, w.Code)
		var errResp ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &errResp)
		require.NoError(err)
		assert.Equal("PROJECT_NOT_FOUND", errResp.Error)
		assert.Equal(serviceErr.Error(), errResp.Message)
		mockService.AssertExpectations(t)
	})
}

// (Tests for new team handlers: InviteMember, UpdateMemberRole, RemoveMember will go here) // <-- Placeholder can be removed
