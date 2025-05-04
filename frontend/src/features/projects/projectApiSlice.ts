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

// Define the Dataset type based on backend ObjectSummary
interface DatasetSummary {
  name: string;
  size: number; // Assuming bytes
  lastUpdated: string; // ISO Date string
  uri: string;
}

// Define the type for the dataset content (matches page component)
interface DatasetContent {
  data: Record<string, any>[];
  // Add other relevant metadata if the API provides it
}

// Enhance apiSlice tagTypes
const enhancedApiSlice = apiSlice.enhanceEndpoints({ addTagTypes: ['Dataset', 'DatasetContent'] });

// --- Inject Endpoints ---

export const projectApiSlice = enhancedApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // --- Project CRUD ---
    listProjects: builder.query<ListProjectsResponse, ListProjectsParams | void>({
      query: (params) => ({
        url: '/projects',
        params: params || {}, // Pass query params if provided
      }),
      // Cache based on the list itself and individual project IDs
      providesTags: (result) => {
        const projectTags = 
          result && Array.isArray(result.projects) 
            ? result.projects.map(({ id }) => ({ type: 'Project' as const, id })) 
            : [];
        return [{ type: 'Project', id: 'LIST' }, ...projectTags];
      },
    }),

    getProject: builder.query<Project, string>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (projectDetails) => ({
        url: '/projects',
        method: 'POST',
        body: projectDetails,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Project', id: 'LIST' }],
    }),

    updateProject: builder.mutation<Project, { projectId: string; updates: UpdateProjectRequest }>({
      query: ({ projectId, updates }) => ({
        url: `/projects/${projectId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Project', id: arg.projectId }, { type: 'Project', id: 'LIST' }],
    }),

    deleteProject: builder.mutation<void, string>({
      query: (projectId) => ({
        url: `/projects/${projectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Project', id: arg }, { type: 'Project', id: 'LIST' }],
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

    // New List Datasets Query
    listDatasets: builder.query<DatasetSummary[], string>({ // Returns array of summaries, takes projectId
        query: (projectId) => `/projects/${projectId}/datasets`,
        providesTags: (result, error, projectId) => 
          result
            ? [
                // Provides a tag for the whole list associated with the project
                { type: 'Dataset', id: `LIST-${projectId}` }, 
                // Optionally provide tags for individual datasets if IDs were available
                // ...result.map(({ id }) => ({ type: 'Dataset', id })), 
              ]
            : [{ type: 'Dataset', id: `LIST-${projectId}` }], 
    }),

    uploadDataset: builder.mutation<{ message: string; datasetName: string; uri: string; }, { projectId: string; formData: FormData }>({
        query: ({ projectId, formData }) => ({
          url: `/projects/${projectId}/datasets`,
          method: 'POST',
          body: formData,
          formData: true, 
        }),
        // Invalidate the dataset list tag for the specific project on successful upload
        invalidatesTags: (result, error, arg) => [{ type: 'Dataset', id: `LIST-${arg.projectId}` }], 
      }),

    // New endpoint for fetching dataset content
    getDatasetContent: builder.query<DatasetContent, { projectId: string; datasetId: string }>({ 
      query: ({ projectId, datasetId }) => `/projects/${projectId}/datasets/${encodeURIComponent(datasetId)}/content`, // Assuming name is used as ID for now, encode it
      providesTags: (result, error, { projectId, datasetId }) => [{ type: 'DatasetContent', id: `${projectId}-${datasetId}` }],
    }),

  }),
  overrideExisting: false, // Keep existing endpoints
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
  useUploadDatasetMutation,
  useListDatasetsQuery, // Export the new query hook
  useGetDatasetContentQuery, // Export the new content query hook
  // Add lazy query hooks if needed
  useLazyListProjectsQuery,
  useLazyGetProjectQuery,
} = projectApiSlice; 