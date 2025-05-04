import { apiSlice } from '@/store/apiSlice'; // Adjust path as needed
import { User, RegisterRequest, LoginRequest, LoginResponse } from '@/types/user.types';

// --- Types (Based on OpenAPI Spec) ---
// Moved to @/types/user.types.ts
// interface User {...}
// type RegisterRequest = ...;
// type LoginRequest = ...;
// interface LoginResponse {...}

// --- Inject Endpoints --- 

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Mutation for user registration
    register: builder.mutation<User, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      // Optionally invalidate user list or session query on successful registration
      // invalidatesTags: [{ type: 'User', id: 'LIST' }], 
    }),

    // Mutation for user login
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      // We might want to invalidate session or trigger a fetch of session data
      // Or handle setting auth state directly in the calling component/thunk
      // invalidatesTags: ['User'], 
    }),

    // Mutation for user logout
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      // Clear user session data on logout
      // invalidatesTags: ['User'], 
      // Alternatively, dispatch clear action in component
    }),

    // Query to get current session info (logged-in user)
    getSession: builder.query<User, void>({
      query: () => '/auth/session',
      // Provides tag for caching user data
      providesTags: (result, error, arg) => 
        result ? [{ type: 'User', id: result.id }] : [],
    }),
  }),
  // Setting overrideExisting to false is the default behavior,
  // but explicitly stating it can sometimes help clarity if extending later.
  overrideExisting: false, 
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetSessionQuery,
  // useLazyGetSessionQuery // For triggering fetch manually
} = authApiSlice; 