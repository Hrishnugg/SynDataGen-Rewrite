import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the base URL for the API. Replace with your actual backend URL.
// Consider using an environment variable for this.
// The base URL should point to the server root, the /api/v1 prefix is added by the endpoint definitions.
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'; // Use NEXT_PUBLIC_API_URL

/**
 * Base RTK Query API slice. Endpoints will be injected into this slice.
 */
export const apiSlice = createApi({
  reducerPath: 'api', // The key where the reducer will be added to the store
  baseQuery: fetchBaseQuery({ 
    // Prepend /api/v1 to the base URL for all requests
    baseUrl: `${baseUrl}/api/v1`, 
    // Explicitly include credentials (cookies) in requests
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      // Cookies are handled automatically now with credentials: 'include'
      return headers;
    },
   }),
  tagTypes: ['User', 'Project', 'Job', 'TeamMember'], // Define tags for caching
  endpoints: (builder) => ({}), // Endpoints are injected elsewhere
});

// Export hooks for usage in components, which are generated automatically
// based on the endpoints defined (none yet, will be added via injection)
// export const { useSomeQueryQuery, useSomeMutationMutation } = apiSlice; 