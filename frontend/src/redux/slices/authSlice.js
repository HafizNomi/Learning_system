import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { authAPI } from '../../api/endpoints';
import {
  clearTokens,
  extractErrorMessage,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../../api/authStorage';

/** Shared rejection shape: the raw DRF body plus a display-ready message. */
const rejectFrom = (error, fallback) => ({
  errors: error.response?.data ?? null,
  message: extractErrorMessage(error.response?.data, error.message || fallback),
});

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Login returns the user alongside the token pair - no second request.
      const { data } = await authAPI.login({ email, password });
      setTokens({ access: data.access, refresh: data.refresh });
      return { user: data.user, tokens: { access: data.access, refresh: data.refresh } };
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Login failed'));
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      // Registration signs the user straight in and returns a token pair.
      const { data } = await authAPI.register(userData);
      setTokens({ access: data.access, refresh: data.refresh });
      return {
        user: data.user,
        tokens: { access: data.access, refresh: data.refresh },
        message: data.message,
      };
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Registration failed'));
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refresh = getRefreshToken();
  if (refresh) {
    // Revoke server-side; a failure here must not trap the user in the app.
    try {
      await authAPI.logout(refresh);
    } catch {
      /* token already expired or revoked - clearing locally is enough */
    }
  }
  clearTokens();
  return null;
});

/** Re-hydrate the session on app boot when a token is already in storage. */
export const loadCurrentUser = createAsyncThunk(
  'auth/loadCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.me();
      return data;
    } catch (error) {
      clearTokens();
      return rejectWithValue(rejectFrom(error, 'Session expired'));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.updateProfile(payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not update your profile'));
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      // Other sessions are revoked server-side; store the fresh pair we get back.
      const { data } = await authAPI.changePassword(payload);
      setTokens({ access: data.access, refresh: data.refresh });
      return { tokens: { access: data.access, refresh: data.refresh }, message: data.message };
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not change your password'));
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.requestPasswordReset(email);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not send the reset email'));
    }
  }
);

export const confirmPasswordReset = createAsyncThunk(
  'auth/confirmPasswordReset',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.confirmPasswordReset(payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not reset your password'));
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.verifyEmail(payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not verify your email'));
    }
  }
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.resendVerification(email);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not resend the verification email'));
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState = {
  user: null,
  tokens: {
    access: getAccessToken(),
    refresh: getRefreshToken(),
  },
  isAuthenticated: Boolean(getAccessToken()),
  // True until the boot-time `loadCurrentUser` settles, so guards can wait
  // instead of bouncing a signed-in user to /login on a hard refresh.
  isInitialising: Boolean(getAccessToken()),
  isLoading: false,
  error: null,
  errors: null,
};

const pending = (state) => {
  state.isLoading = true;
  state.error = null;
  state.errors = null;
};

const rejected = (state, action, { silent = false } = {}) => {
  state.isLoading = false;
  state.error = action.payload?.message ?? 'Something went wrong';
  state.errors = action.payload?.errors ?? null;
  if (!silent) toast.error(state.error);
};

const signedOut = (state) => {
  state.user = null;
  state.isAuthenticated = false;
  state.tokens = { access: null, refresh: null };
  state.isInitialising = false;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.errors = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Login ---
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.isInitialising = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        toast.success('Welcome back!');
      })
      .addCase(loginUser.rejected, (state, action) => rejected(state, action))

      // --- Register ---
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.isInitialising = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        toast.success(action.payload.message || 'Account created!');
      })
      .addCase(registerUser.rejected, (state, action) => rejected(state, action))

      // --- Boot-time hydration (stays quiet: an expired token is not an error
      // the user needs a toast about) ---
      .addCase(loadCurrentUser.pending, (state) => {
        state.isInitialising = true;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialising = false;
      })
      .addCase(loadCurrentUser.rejected, signedOut)

      // --- Profile ---
      .addCase(updateProfile.pending, pending)
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        toast.success('Profile updated');
      })
      .addCase(updateProfile.rejected, (state, action) => rejected(state, action))

      // --- Change password ---
      .addCase(changePassword.pending, pending)
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tokens = action.payload.tokens;
        toast.success(action.payload.message || 'Password changed');
      })
      .addCase(changePassword.rejected, (state, action) => rejected(state, action))

      // --- Password reset ---
      .addCase(requestPasswordReset.pending, pending)
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.isLoading = false;
        toast.success(action.payload.message);
      })
      .addCase(requestPasswordReset.rejected, (state, action) => rejected(state, action))

      .addCase(confirmPasswordReset.pending, pending)
      .addCase(confirmPasswordReset.fulfilled, (state, action) => {
        state.isLoading = false;
        toast.success(action.payload.message);
      })
      .addCase(confirmPasswordReset.rejected, (state, action) => rejected(state, action))

      // --- Email verification ---
      .addCase(verifyEmail.pending, pending)
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.user) state.user = action.payload.user;
        toast.success(action.payload.message);
      })
      .addCase(verifyEmail.rejected, (state, action) => rejected(state, action))

      .addCase(resendVerification.pending, pending)
      .addCase(resendVerification.fulfilled, (state, action) => {
        state.isLoading = false;
        toast.success(action.payload.message);
      })
      .addCase(resendVerification.rejected, (state, action) => rejected(state, action))

      // --- Logout ---
      .addCase(logoutUser.fulfilled, (state) => {
        signedOut(state);
        state.isLoading = false;
        toast.info('Logged out successfully');
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
