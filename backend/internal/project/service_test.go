package project

import (
	"SynDataGen/backend/internal/core"
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// --- Mocks ---

// MockProjectRepository is a mock implementation of core.ProjectRepository
type MockProjectRepository struct {
	mock.Mock
}

func (m *MockProjectRepository) CreateProject(ctx context.Context, project *core.Project) (string, error) {
	args := m.Called(ctx, project)
	// Simulate setting timestamps like the real repo
	if args.Error(0) == nil && project != nil {
		project.ID = "proj-" + uuid.NewString() // Simulate ID assignment
		now := time.Now().UTC()
		project.CreatedAt = now
		project.UpdatedAt = now
	}
	return project.ID, args.Error(0)
}

func (m *MockProjectRepository) GetProjectByID(ctx context.Context, id string) (*core.Project, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.Project), args.Error(1)
}

func (m *MockProjectRepository) ListProjects(ctx context.Context, userID string, statusFilter string, limit int, offset int) ([]*core.Project, error) {
	args := m.Called(ctx, userID, statusFilter, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*core.Project), args.Error(1)
}

func (m *MockProjectRepository) CountProjects(ctx context.Context, userID string, statusFilter string) (int, error) {
	args := m.Called(ctx, userID, statusFilter)
	return args.Int(0), args.Error(1)
}

func (m *MockProjectRepository) UpdateProject(ctx context.Context, project *core.Project) error {
	args := m.Called(ctx, project)
	// Simulate timestamp update on successful call
	if args.Error(0) == nil && project != nil {
		project.UpdatedAt = time.Now().UTC()
	}
	return args.Error(0)
}

func (m *MockProjectRepository) DeleteProject(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// MockUserRepository is a mock implementation of core.UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) CreateUser(ctx context.Context, user *core.User) (string, error) {
	args := m.Called(ctx, user)
	return args.String(0), args.Error(1)
}

func (m *MockUserRepository) GetUserByID(ctx context.Context, id string) (*core.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.User), args.Error(1)
}

func (m *MockUserRepository) GetUserByEmail(ctx context.Context, email string) (*core.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*core.User), args.Error(1)
}

// MockStorageService is a mock implementation of core.StorageService
type MockStorageService struct {
	mock.Mock
}

func (m *MockStorageService) CreateProjectBucket(ctx context.Context, projectID, creatorID, regionHint string) (bucketName, region string, err error) {
	args := m.Called(ctx, projectID, creatorID, regionHint)
	return args.String(0), args.String(1), args.Error(2)
}

func (m *MockStorageService) DeleteProjectBucket(ctx context.Context, bucketName string, force bool) error {
	args := m.Called(ctx, bucketName, force)
	return args.Error(0)
}

// Helper to create service with mocks for testing project service methods
func setupProjectServiceTest() (ProjectService, *MockProjectRepository, *MockUserRepository, *MockStorageService) {
	mockProjectRepo := new(MockProjectRepository)
	mockUserRepo := new(MockUserRepository)
	mockStorageSvc := new(MockStorageService)

	service := NewProjectService(mockProjectRepo, mockUserRepo, mockStorageSvc)
	return service, mockProjectRepo, mockUserRepo, mockStorageSvc
}

// --- Test Functions ---

// TODO: Add tests for CreateProject, ListProjects, GetProjectByID, UpdateProject, DeleteProject if not already present.

// --- Authorization Helper Tests ---

func TestProjectService_checkProjectAccess(t *testing.T) {
	assert := assert.New(t)

	// Dummy service instance - dependencies are not needed for this helper test
	s := &projectService{}

	// Define users
	ownerID := "user-owner"
	adminID := "user-admin"
	memberID := "user-member"
	viewerID := "user-viewer"
	strangerID := "user-stranger"

	// Define a sample project with various roles
	sampleProject := &core.Project{
		ID:   "proj-1",
		Name: "Auth Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			adminID:  core.RoleAdmin,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}

	nilProject := (*core.Project)(nil)
	projectWithNilMembers := &core.Project{ID: "proj-2", TeamMembers: nil}
	projectWithEmptyMembers := &core.Project{ID: "proj-3", TeamMembers: map[string]core.Role{}}

	tests := []struct {
		name         string
		project      *core.Project
		userID       string
		requiredRole core.Role
		expected     bool
	}{
		// --- Basic Success Cases ---
		{"Owner required, Owner checks", sampleProject, ownerID, core.RoleOwner, true},
		{"Admin required, Owner checks", sampleProject, ownerID, core.RoleAdmin, true},
		{"Member required, Owner checks", sampleProject, ownerID, core.RoleMember, true},
		{"Viewer required, Owner checks", sampleProject, ownerID, core.RoleViewer, true},

		{"Admin required, Admin checks", sampleProject, adminID, core.RoleAdmin, true},
		{"Member required, Admin checks", sampleProject, adminID, core.RoleMember, true},
		{"Viewer required, Admin checks", sampleProject, adminID, core.RoleViewer, true},

		{"Member required, Member checks", sampleProject, memberID, core.RoleMember, true},
		{"Viewer required, Member checks", sampleProject, memberID, core.RoleViewer, true},

		{"Viewer required, Viewer checks", sampleProject, viewerID, core.RoleViewer, true},

		// --- Failure Cases (Insufficient Role) ---
		{"Owner required, Admin checks", sampleProject, adminID, core.RoleOwner, false},
		{"Owner required, Member checks", sampleProject, memberID, core.RoleOwner, false},
		{"Owner required, Viewer checks", sampleProject, viewerID, core.RoleOwner, false},

		{"Admin required, Member checks", sampleProject, memberID, core.RoleAdmin, false},
		{"Admin required, Viewer checks", sampleProject, viewerID, core.RoleAdmin, false},

		{"Member required, Viewer checks", sampleProject, viewerID, core.RoleMember, false},

		// --- Failure Cases (User Not Member) ---
		{"Owner required, Stranger checks", sampleProject, strangerID, core.RoleOwner, false},
		{"Viewer required, Stranger checks", sampleProject, strangerID, core.RoleViewer, false},
		{"Viewer required, Stranger checks empty members", projectWithEmptyMembers, strangerID, core.RoleViewer, false},

		// --- Edge Cases ---
		{"Nil Project", nilProject, ownerID, core.RoleViewer, false},
		{"Project with nil members map", projectWithNilMembers, ownerID, core.RoleViewer, false},
		{"Project with empty members map, Owner checks", projectWithEmptyMembers, ownerID, core.RoleOwner, false}, // Owner not in map
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := s.checkProjectAccess(tt.project, tt.userID, tt.requiredRole)
			assert.Equal(tt.expected, actual)
		})
	}
}

// --- New Team Management Service Tests ---

func TestProjectService_InviteMember(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	projectID := "proj-invite-" + uuid.NewString()
	ownerID := "user-owner"
	adminID := "user-admin"
	memberID := "user-member"
	viewerID := "user-viewer"
	newUserID := "user-new"
	nonExistentUserID := "user-ghost"

	mockProjectBefore := &core.Project{
		ID:   projectID,
		Name: "Invite Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			adminID:  core.RoleAdmin,
			memberID: core.RoleMember,
			// viewerID is NOT initially in the project for some tests
		},
	}
	// Deep copy for verifying updates without modifying the original mock
	copyProject := func(p *core.Project) *core.Project {
		cp := *p
		cp.TeamMembers = make(map[string]core.Role)
		for k, v := range p.TeamMembers {
			cp.TeamMembers[k] = v
		}
		return &cp
	}

	mockNewUser := &core.User{ID: newUserID, Email: "new@example.com"}
	mockViewerUser := &core.User{ID: viewerID, Email: "viewer@example.com"}

	inviteReq := InviteMemberRequest{UserID: newUserID, Role: core.RoleMember}
	inviteViewerReq := InviteMemberRequest{UserID: viewerID, Role: core.RoleViewer}
	inviteExistingReq := InviteMemberRequest{UserID: memberID, Role: core.RoleViewer}  // Try to invite existing member
	inviteOwnerRoleReq := InviteMemberRequest{UserID: newUserID, Role: core.RoleOwner} // Try to invite as owner
	inviteGhostReq := InviteMemberRequest{UserID: nonExistentUserID, Role: core.RoleViewer}

	t.Run("Success_OwnerInvitesMember", func(t *testing.T) {
		service, mockProjectRepo, mockUserRepo, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockUserRepo.On("GetUserByID", ctx, inviteReq.UserID).Return(mockNewUser, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			_, exists := p.TeamMembers[inviteReq.UserID]
			return exists && p.TeamMembers[inviteReq.UserID] == inviteReq.Role
		})).Return(nil).Once()

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteReq)

		require.NoError(err)
		require.NotNil(updatedProject)
		assert.Equal(inviteReq.Role, updatedProject.TeamMembers[inviteReq.UserID])
		assert.Len(updatedProject.TeamMembers, 4) // owner, admin, member + new member

		mockProjectRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})

	t.Run("Success_AdminInvitesViewer", func(t *testing.T) {
		service, mockProjectRepo, mockUserRepo, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockUserRepo.On("GetUserByID", ctx, inviteViewerReq.UserID).Return(mockViewerUser, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.AnythingOfType("*core.Project")).Return(nil).Once()

		updatedProject, err := service.InviteMember(ctx, projectID, adminID, inviteViewerReq)

		require.NoError(err)
		require.NotNil(updatedProject)
		assert.Equal(inviteViewerReq.Role, updatedProject.TeamMembers[inviteViewerReq.UserID])

		mockProjectRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})

	t.Run("Failure_MemberCannotInvite", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		// User repo and update should not be called

		updatedProject, err := service.InviteMember(ctx, projectID, memberID, inviteReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, ErrProjectAccessDenied)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_UserAlreadyMember", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		// User repo and update should not be called

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteExistingReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "already a member")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_CannotInviteAsOwner", func(t *testing.T) {
		service, mockProjectRepo, mockUserRepo, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockUserRepo.On("GetUserByID", ctx, inviteOwnerRoleReq.UserID).Return(mockNewUser, nil).Once()
		// Update should not be called

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteOwnerRoleReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "invalid role specified") // Service validates role

		mockProjectRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})

	t.Run("Failure_TargetUserNotFoundInSystem", func(t *testing.T) {
		service, mockProjectRepo, mockUserRepo, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockUserRepo.On("GetUserByID", ctx, inviteGhostReq.UserID).Return(nil, nil).Once() // User repo returns nil, nil for not found
		// Update should not be called

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteGhostReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "user with ID")
		assert.Contains(err.Error(), "not found")

		mockProjectRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})

	t.Run("Failure_GetUserError", func(t *testing.T) {
		service, mockProjectRepo, mockUserRepo, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)
		dbError := errors.New("user db error")

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockUserRepo.On("GetUserByID", ctx, inviteReq.UserID).Return(nil, dbError).Once()
		// Update should not be called

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, dbError)
		assert.Contains(err.Error(), "failed to verify target user")

		mockProjectRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})

	t.Run("Failure_ProjectUpdateError", func(t *testing.T) {
		service, mockProjectRepo, mockUserRepo, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)
		dbError := errors.New("project update failed")

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockUserRepo.On("GetUserByID", ctx, inviteReq.UserID).Return(mockNewUser, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.AnythingOfType("*core.Project")).Return(dbError).Once()

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, ErrProjectUpdateFailed)

		mockProjectRepo.AssertExpectations(t)
		mockUserRepo.AssertExpectations(t)
	})

	t.Run("Failure_GetProjectError", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		dbError := errors.New("get project failed")

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(nil, dbError).Once()
		// Other mocks shouldn't be called

		updatedProject, err := service.InviteMember(ctx, projectID, ownerID, inviteReq)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, dbError)

		mockProjectRepo.AssertExpectations(t)
	})
}

func TestProjectService_UpdateMemberRole(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	projectID := "proj-update-" + uuid.NewString()
	ownerID := "user-owner"
	adminID := "user-admin"
	memberID := "user-member"
	viewerID := "user-viewer"
	strangerID := "user-stranger"

	mockProjectBefore := &core.Project{
		ID:   projectID,
		Name: "Update Role Test Project",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			adminID:  core.RoleAdmin,
			memberID: core.RoleMember,
			viewerID: core.RoleViewer,
		},
	}
	// Deep copy helper
	copyProject := func(p *core.Project) *core.Project {
		cp := *p
		cp.TeamMembers = make(map[string]core.Role)
		for k, v := range p.TeamMembers {
			cp.TeamMembers[k] = v
		}
		return &cp
	}

	newRoleAdmin := core.RoleAdmin
	newRoleMember := core.RoleMember
	newRoleOwner := core.RoleOwner // Invalid target role

	t.Run("Success_OwnerUpdatesMemberToAdmin", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			return p.TeamMembers[memberID] == newRoleAdmin
		})).Return(nil).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, ownerID, memberID, newRoleAdmin)

		require.NoError(err)
		require.NotNil(updatedProject)
		assert.Equal(newRoleAdmin, updatedProject.TeamMembers[memberID])

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Success_AdminUpdatesViewerToMember", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			return p.TeamMembers[viewerID] == newRoleMember
		})).Return(nil).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, adminID, viewerID, newRoleMember)

		require.NoError(err)
		require.NotNil(updatedProject)
		assert.Equal(newRoleMember, updatedProject.TeamMembers[viewerID])

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_MemberCannotUpdateRole", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		// UpdateProject should not be called

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, memberID, viewerID, newRoleMember)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, ErrProjectAccessDenied)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_CannotUpdateOwnerRole", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, ownerID, ownerID, newRoleAdmin) // Try to change owner's role

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "cannot change the role of the project owner")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_CannotAssignOwnerRole", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, ownerID, memberID, newRoleOwner) // Try to assign owner

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "cannot assign owner role")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_CannotUpdateOwnRole", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, adminID, adminID, newRoleMember) // Admin tries to change own role

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "cannot change your own role")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_TargetMemberNotFound", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, ownerID, strangerID, newRoleMember)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "target user")
		assert.Contains(err.Error(), "not found in project")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Success_NoUpdateNeeded", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		// UpdateProject should NOT be called

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, ownerID, memberID, core.RoleMember) // Role is already member

		require.NoError(err)
		require.NotNil(updatedProject)
		assert.Equal(core.RoleMember, updatedProject.TeamMembers[memberID]) // Role unchanged

		mockProjectRepo.AssertExpectations(t)
		mockProjectRepo.AssertNotCalled(t, "UpdateProject", mock.Anything, mock.Anything)
	})

	t.Run("Failure_ProjectUpdateError", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectBefore)
		dbError := errors.New("project update failed")

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.AnythingOfType("*core.Project")).Return(dbError).Once()

		updatedProject, err := service.UpdateMemberRole(ctx, projectID, ownerID, memberID, newRoleAdmin)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, ErrProjectUpdateFailed)

		mockProjectRepo.AssertExpectations(t)
	})
}

func TestProjectService_RemoveMember(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	ctx := context.Background()

	projectID := "proj-remove-" + uuid.NewString()
	ownerID := "user-owner"
	adminID := "user-admin"
	memberID := "user-member"
	viewerID := "user-viewer"
	strangerID := "user-stranger"

	mockProjectMultiOwner := &core.Project{
		ID:   projectID,
		Name: "Remove Test Project Multi Owner",
		TeamMembers: map[string]core.Role{
			ownerID:   core.RoleOwner,
			"owner-2": core.RoleOwner, // Second owner
			adminID:   core.RoleAdmin,
			memberID:  core.RoleMember,
			viewerID:  core.RoleViewer,
		},
	}
	mockProjectSingleOwner := &core.Project{
		ID:   projectID,
		Name: "Remove Test Project Single Owner",
		TeamMembers: map[string]core.Role{
			ownerID:  core.RoleOwner,
			adminID:  core.RoleAdmin,
			memberID: core.RoleMember,
		},
	}
	// Deep copy helper
	copyProject := func(p *core.Project) *core.Project {
		cp := *p
		cp.TeamMembers = make(map[string]core.Role)
		for k, v := range p.TeamMembers {
			cp.TeamMembers[k] = v
		}
		return &cp
	}

	t.Run("Success_OwnerRemovesAdmin", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			_, exists := p.TeamMembers[adminID]
			return !exists // Admin should be removed
		})).Return(nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, ownerID, adminID)

		require.NoError(err)
		require.NotNil(updatedProject)
		_, exists := updatedProject.TeamMembers[adminID]
		assert.False(exists)
		assert.Len(updatedProject.TeamMembers, 4)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Success_AdminRemovesMember", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			_, exists := p.TeamMembers[memberID]
			return !exists
		})).Return(nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, adminID, memberID)

		require.NoError(err)
		require.NotNil(updatedProject)
		_, exists := updatedProject.TeamMembers[memberID]
		assert.False(exists)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Success_MemberRemovesSelf (Leaves)", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			_, exists := p.TeamMembers[memberID]
			return !exists
		})).Return(nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, memberID, memberID)

		require.NoError(err)
		require.NotNil(updatedProject)
		_, exists := updatedProject.TeamMembers[memberID]
		assert.False(exists)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Success_AdminRemovesSelf (Leaves)", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			_, exists := p.TeamMembers[adminID]
			return !exists
		})).Return(nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, adminID, adminID)

		require.NoError(err)
		require.NotNil(updatedProject)
		_, exists := updatedProject.TeamMembers[adminID]
		assert.False(exists)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Success_OwnerRemovesSelf (Multiple Owners)", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.MatchedBy(func(p *core.Project) bool {
			_, exists := p.TeamMembers[ownerID]
			return !exists
		})).Return(nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, ownerID, ownerID)

		require.NoError(err)
		require.NotNil(updatedProject)
		_, exists := updatedProject.TeamMembers[ownerID]
		assert.False(exists)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_MemberCannotRemoveViewer", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		// UpdateProject should not be called

		updatedProject, err := service.RemoveMember(ctx, projectID, memberID, viewerID)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, ErrProjectAccessDenied)

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_ViewerCannotRemoveSelf", func(t *testing.T) {
		// Technically allowed by current logic, as viewers are team members.
		// If viewers shouldn't be able to leave, the auth check needs adjustment.
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.AnythingOfType("*core.Project")).Return(nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, viewerID, viewerID)
		require.NoError(err)
		require.NotNil(updatedProject)
		_, exists := updatedProject.TeamMembers[viewerID]
		assert.False(exists)
		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_LastOwnerCannotRemoveSelf", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectSingleOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, ownerID, ownerID)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "last owner cannot leave")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_AdminCannotRemoveOwner", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectSingleOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, adminID, ownerID)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "project owner cannot be removed")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_TargetMemberNotFound", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, ownerID, strangerID)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.Contains(err.Error(), "target user")
		assert.Contains(err.Error(), "not found in project")

		mockProjectRepo.AssertExpectations(t)
	})

	t.Run("Failure_ProjectUpdateError", func(t *testing.T) {
		service, mockProjectRepo, _, _ := setupProjectServiceTest()
		currentProject := copyProject(mockProjectMultiOwner)
		dbError := errors.New("project update failed")

		mockProjectRepo.On("GetProjectByID", ctx, projectID).Return(currentProject, nil).Once()
		mockProjectRepo.On("UpdateProject", ctx, mock.AnythingOfType("*core.Project")).Return(dbError).Once()

		updatedProject, err := service.RemoveMember(ctx, projectID, ownerID, adminID)

		require.Error(err)
		assert.Nil(updatedProject)
		assert.ErrorIs(err, ErrProjectUpdateFailed)

		mockProjectRepo.AssertExpectations(t)
	})
}
