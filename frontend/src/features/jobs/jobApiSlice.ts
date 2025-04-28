import { apiSlice } from '@/store/apiSlice';
import { 
    Job, 
    JobStatus, 
    CreateJobRequest, 
    ListJobsParams, 
    ListJobsResponse, 
    ListAllJobsResponse, 
    ListAllJobsParams 
} from '@/types/job.types';

// --- Types (Based on OpenAPI spec & backend analysis) ---
// Moved to @/types/job.types.ts
// type JobStatus = ...;
// interface Job {...}
// interface CreateJobRequest {...}
// interface ListJobsParams {...}
// interface ListJobsResponse {...}
// interface ListAllJobsResponse {...}
// interface ListAllJobsParams {...}

// --- Inject Endpoints ---

export const jobApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // --- New Query for All Accessible Jobs ---
    listAllAccessibleJobs: builder.query<ListAllJobsResponse, ListAllJobsParams | void>({
      query: (params) => ({
        url: '/jobs', // Hits the new GET /jobs endpoint
        params: params || {},
      }),
      // Provides a general 'Job' list tag and specific IDs
      providesTags: (result) => [
        { type: 'Job', id: 'LIST-ALL' }, // General tag for all jobs list
        ...(result?.jobs.map(({ id }) => ({ type: 'Job' as const, id })) || []),
      ],
    }),

    listJobs: builder.query<ListJobsResponse, { projectId: string; params?: ListJobsParams }>({
      query: ({ projectId, params }) => ({
        url: `/projects/${projectId}/jobs`,
        params: params || {},
      }),
      providesTags: (result, error, { projectId }) => [
        // Tag for the list associated with this specific project
        { type: 'Job', id: `LIST-${projectId}` }, 
        // Individual job tags
        ...(result?.jobs.map(({ id }) => ({ type: 'Job' as const, id })) || []),
      ],
    }),

    getJob: builder.query<Job, string>({
      query: (jobId) => `/jobs/${jobId}`,
      providesTags: (result, error, id) => [{ type: 'Job', id }],
    }),

    createJob: builder.mutation<Job, { projectId: string; newJob: Omit<CreateJobRequest, 'projectId'> }>({
      query: ({ projectId, newJob }) => ({
        url: `/projects/${projectId}/jobs`,
        method: 'POST',
        // Backend handler expects projectId in body currently, adjust if changed
        body: { ...newJob, projectId }, 
      }),
      // Invalidate the job list for the specific project
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Job', id: `LIST-${projectId}` },
      ],
    }),

    cancelJob: builder.mutation<Job, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}`,
        method: 'DELETE', // Corresponds to OpenAPI DELETE for cancellation
      }),
      // Invalidate the specific job and its project's list
      invalidatesTags: (result, error, jobId) => {
        const tags: { type: 'Job' | 'Project', id: string | 'LIST' }[] = [{ type: 'Job', id: jobId }];
        // If the result includes the projectId, invalidate the list too
        if (result?.projectId) {
          tags.push({ type: 'Job', id: `LIST-${result.projectId}` });
        }
        return tags;
      },
    }),

    // --- New Mutations ---
    submitJob: builder.mutation<Job, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/submit`,
        method: 'POST',
      }),
      // Invalidate the specific job and its project list on successful submission
      invalidatesTags: (result, error, jobId) => {
        const tags: { type: 'Job' | 'Project', id: string | 'LIST' }[] = [{ type: 'Job', id: jobId }];
        if (result?.projectId) {
          tags.push({ type: 'Job', id: `LIST-${result.projectId}` });
        }
        return tags;
      },
    }),

    syncJobStatus: builder.mutation<Job, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/sync`,
        method: 'POST',
      }),
       // Invalidate the specific job and its project list on successful sync
       invalidatesTags: (result, error, jobId) => {
        const tags: { type: 'Job' | 'Project', id: string | 'LIST' }[] = [{ type: 'Job', id: jobId }];
        if (result?.projectId) {
          tags.push({ type: 'Job', id: `LIST-${result.projectId}` });
        }
        return tags;
      },
    }),

    // TODO: Add mutations for submitJob and syncJobStatus once backend endpoints are available
    /*
    submitJob: builder.mutation<Job, string>({...}),
    syncJobStatus: builder.mutation<Job, string>({...}), 
    */
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useListAllAccessibleJobsQuery,
  useListJobsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useCancelJobMutation,
  useSubmitJobMutation,
  useSyncJobStatusMutation,
  useLazyListProjectsQuery,
  useLazyGetProjectQuery,
  useLazyListJobsQuery,
  useLazyGetJobQuery,
} = jobApiSlice; 