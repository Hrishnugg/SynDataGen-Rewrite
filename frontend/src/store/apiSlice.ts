import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the base URL for the API. Replace with your actual backend URL.
// Consider using an environment variable for this.
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/v1'; // Placeholder

/**
 * Base RTK Query API slice. Endpoints will be injected into this slice.
 */
export const apiSlice = createApi({
  reducerPath: 'api', // The key where the reducer will be added to the store
  baseQuery: fetchBaseQuery({ 
    baseUrl,
    // Prepare headers - useful for adding auth tokens, etc.
    prepareHeaders: (headers, { getState }) => {
      // Example: If we were using token authentication stored in Redux state
      // const token = (getState() as RootState).auth.token;
      // if (token) {
      //   headers.set('authorization', `Bearer ${token}`)
      // }
      // For session cookies managed by the backend, we might not need to do anything here
      // unless we need to set specific headers like CSRF tokens.
      return headers;
    },
   }),
  tagTypes: ['User', 'Project', 'Job', 'TeamMember'], // Define tags for caching
  endpoints: (builder) => ({}), // Endpoints are injected elsewhere
});

// Export hooks for usage in components, which are generated automatically
// based on the endpoints defined (none yet, will be added via injection)
// export const { useSomeQueryQuery, useSomeMutationMutation } = apiSlice; 