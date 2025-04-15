import { apiSlice } from '@/store/apiSlice'; // Adjust path as needed

// --- Define types based on OpenAPI Spec --- TODO: Move to a shared types file?

interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

// Using Omit to create types for request bodies
type RegisterRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string };
type LoginRequest = Pick<User, 'email'> & { password: string };

interface LoginResponse {
  user: User;
  // token?: string; // Assuming cookie-based, so no token expected here
}

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