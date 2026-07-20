import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import courseReducer from './slices/courseSlice';
import applicationReducer from './slices/applicationSlice';
import sessionReducer from './slices/sessionSlice';
import attendanceReducer from './slices/attendanceSlice';
import paymentReducer from './slices/paymentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courses: courseReducer,
    applications: applicationReducer,
    sessions: sessionReducer,
    attendance: attendanceReducer,
    payments: paymentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled'],
        ignoredPaths: ['auth.user'],
      },
    }),
});