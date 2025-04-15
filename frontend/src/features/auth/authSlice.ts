import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/store'; // Adjust path as needed
import { authApiSlice } from './authApiSlice'; // Import the API slice

// Define the User type again (consider centralizing types later)
interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

// Define the state structure for authentication
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Action to manually set credentials (e.g., after SSR or initial load)
    setCredentials(state, action: PayloadAction<{ user: User }>) {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    // Action to clear credentials (e.g., on logout)
    clearCredentials(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle successful login: update user and set authenticated
      .addMatcher(
        authApiSlice.endpoints.login.matchFulfilled,
        (state, { payload }) => {
          state.user = payload.user; 
          state.isAuthenticated = true;
        }
      )
      // Handle successful session fetch: update user and set authenticated
      .addMatcher(
        authApiSlice.endpoints.getSession.matchFulfilled,
        (state, { payload }) => {
          state.user = payload;
          state.isAuthenticated = true;
        }
      )
      // Handle failed session fetch or logout: clear state
      .addMatcher(
        authApiSlice.endpoints.getSession.matchRejected,
        (state, action) => {
          // Optional: log error or handle specific unauthorized cases
          console.error('Get session failed:', action.error);
          state.user = null;
          state.isAuthenticated = false;
        }
      )
      .addMatcher(
        authApiSlice.endpoints.logout.matchFulfilled,
        (state) => {
          state.user = null;
          state.isAuthenticated = false;
        }
      );
      // Can add matchers for register success/failure if needed, 
      // although login is usually the trigger for setting auth state.
  },
});

// Export actions
export const { setCredentials, clearCredentials } = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Export selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated; 