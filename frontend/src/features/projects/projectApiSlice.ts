import { apiSlice } from '@/store/apiSlice';
import { Role } from '@/types/role.types';
import {
  Project, 
  ProjectSettings, 
  ProjectStorage, 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  ListProjectsParams, 
  ListProjectsResponse, 
  InviteMemberRequest, 
  UpdateMemberRoleRequest 
} from '@/types/project.types';

// --- Types (Based on OpenAPI spec & backend analysis) ---
// Moved to @/types/
// type Role = ...;
// interface ProjectSettings {...}
// interface ProjectStorage {...}
// interface Project {...}
// interface CreateProjectRequest {...}
// type UpdateProjectRequest = ...;
// interface ListProjectsParams {...}
// interface ListProjectsResponse {...}
// interface InviteMemberRequest {...}
// interface UpdateMemberRoleRequest {...}

// --- Inject Endpoints ---

export const projectApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // --- Project CRUD ---
    listProjects: builder.query<ListProjectsResponse, ListProjectsParams | void>({
      query: (params) => ({
        url: '/projects',
        params: params || {}, // Pass query params if provided
      }),
      // Cache based on the list itself and individual project IDs
      providesTags: (result) => [
        { type: 'Project', id: 'LIST' },
        ...(result?.projects.map(({ id }) => ({ type: 'Project' as const, id })) || []),
      ],
    }),

    getProject: builder.query<Project, string>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (newProject) => ({
        url: '/projects',
        method: 'POST',
        body: newProject,
      }),
      // Invalidate the list cache on creation
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    updateProject: builder.mutation<Project, { projectId: string; updates: UpdateProjectRequest }>({
      query: ({ projectId, updates }) => ({
        url: `/projects/${projectId}`,
        method: 'PATCH',
        body: updates,
      }),
      // Invalidate the specific project and potentially the list cache
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: projectId },
        { type: 'Project', id: 'LIST' }, // Consider invalidating list too
      ],
    }),

    deleteProject: builder.mutation<void, string>({
      query: (projectId) => ({
        url: `/projects/${projectId}`,
        method: 'DELETE',
      }),
      // Invalidate the specific project and the list cache
      invalidatesTags: (result, error, projectId) => [
        { type: 'Project', id: projectId },
        { type: 'Project', id: 'LIST' },
      ],
    }),

    // --- Team Management ---
    inviteMember: builder.mutation<Project, { projectId: string; invite: InviteMemberRequest }>({
      query: ({ projectId, invite }) => ({
        url: `/projects/${projectId}/team`,
        method: 'POST',
        body: invite,
      }),
      // Invalidate the specific project cache to show updated team
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),

    updateMemberRole: builder.mutation<Project, { projectId: string; memberId: string; update: UpdateMemberRoleRequest }>({
      query: ({ projectId, memberId, update }) => ({
        url: `/projects/${projectId}/team/${memberId}`,
        method: 'PUT',
        body: update,
      }),
      // Invalidate the specific project cache
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),

    removeMember: builder.mutation<Project, { projectId: string; memberId: string }>({
      query: ({ projectId, memberId }) => ({
        url: `/projects/${projectId}/team/${memberId}`,
        method: 'DELETE',
      }),
      // Invalidate the specific project cache
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Project', id: projectId }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  // Add lazy query hooks if needed
  useLazyListProjectsQuery,
  useLazyGetProjectQuery,
} = projectApiSlice; 