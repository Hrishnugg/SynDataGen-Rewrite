import { combineReducers } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice';
import authReducer from '../features/auth/authSlice';

// Combine all reducers here
// Feature slices will be added like:
// import authReducer from '../features/auth/authSlice';

export const rootReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,
  auth: authReducer,
  // Add other feature reducers here
}); 