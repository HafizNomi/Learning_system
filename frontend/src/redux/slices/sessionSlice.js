import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { sessionAPI } from '../../api/endpoints';
import { extractErrorMessage } from '../../api/authStorage';

/** Shared rejection shape: the raw DRF body plus a display-ready message. */
const rejectFrom = (error, fallback) => ({
  errors: error.response?.data ?? null,
  message: extractErrorMessage(error.response?.data, error.message || fallback),
  status: error.response?.status ?? null,
});

/** DRF pagination is on globally, so unwrap `results`. */
const unwrapList = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchUpcomingSessions = createAsyncThunk(
  'sessions/fetchUpcoming',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await sessionAPI.getUpcoming();
      return unwrapList(data);
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load your classes'));
    }
  }
);

export const fetchSessionHistory = createAsyncThunk(
  'sessions/fetchHistory',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await sessionAPI.getHistory(params);
      return unwrapList(data);
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load past classes'));
    }
  }
);

/** Everything on one date - the calendar's day panel. */
export const fetchSchedule = createAsyncThunk(
  'sessions/fetchSchedule',
  async (date, { rejectWithValue }) => {
    try {
      const { data } = await sessionAPI.getSchedule(date);
      return { date, sessions: unwrapList(data) };
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load that day'));
    }
  }
);

/** Admin: create a whole run of classes at once. */
export const generateSessions = createAsyncThunk(
  'sessions/generate',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await sessionAPI.generate(payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not schedule those classes'));
    }
  }
);

/** Teacher or admin: reschedule, cancel, or paste the Google Meet link. */
export const updateSession = createAsyncThunk(
  'sessions/update',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await sessionAPI.update(id, payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not update this class'));
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState = {
  // Classes that have not finished yet, soonest first.
  upcoming: [],
  // Classes that have already finished, newest first.
  history: [],
  // The day the calendar is showing, keyed by ISO date.
  scheduleDate: null,
  schedule: [],
  lastGenerated: null,
  loading: false,
  scheduleLoading: false,
  generating: false,
  updatingId: null,
  error: null,
  fieldErrors: null,
};

/** Keep every list in step after one class changes. */
const replaceEverywhere = (state, session) => {
  ['upcoming', 'history', 'schedule'].forEach((key) => {
    const index = state[key].findIndex((item) => item.id === session.id);
    if (index !== -1) state[key][index] = session;
  });
};

const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setSessions(state, action) {
      state.upcoming = action.payload;
    },
    clearSessionError(state) {
      state.error = null;
      state.fieldErrors = null;
    },
    clearGenerated(state) {
      state.lastGenerated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Upcoming ---
      .addCase(fetchUpcomingSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.upcoming = action.payload;
      })
      .addCase(fetchUpcomingSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Could not load your classes';
      })

      // --- History ---
      .addCase(fetchSessionHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSessionHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchSessionHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Could not load past classes';
      })

      // --- One day ---
      .addCase(fetchSchedule.pending, (state) => {
        state.scheduleLoading = true;
      })
      .addCase(fetchSchedule.fulfilled, (state, action) => {
        state.scheduleLoading = false;
        state.scheduleDate = action.payload.date;
        state.schedule = action.payload.sessions;
      })
      .addCase(fetchSchedule.rejected, (state, action) => {
        state.scheduleLoading = false;
        state.error = action.payload?.message ?? 'Could not load that day';
      })

      // --- Bulk generate ---
      .addCase(generateSessions.pending, (state) => {
        state.generating = true;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(generateSessions.fulfilled, (state, action) => {
        state.generating = false;
        state.lastGenerated = action.payload;
        state.upcoming = [...state.upcoming, ...(action.payload.sessions ?? [])]
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        const { created_count: created, skipped_count: skipped } = action.payload;
        if (created > 0) {
          toast.success(
            skipped > 0
              ? `Scheduled ${created} classes. ${skipped} slots were skipped.`
              : `Scheduled ${created} classes.`
          );
        } else {
          // Not an error, but the admin needs to know nothing happened.
          toast.warn('No classes were scheduled - every slot was taken or in the past.');
        }
      })
      .addCase(generateSessions.rejected, (state, action) => {
        state.generating = false;
        state.error = action.payload?.message ?? 'Could not schedule those classes';
        state.fieldErrors = action.payload?.errors ?? null;
        toast.error(state.error);
      })

      // --- Update one ---
      .addCase(updateSession.pending, (state, action) => {
        state.updatingId = action.meta.arg.id;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(updateSession.fulfilled, (state, action) => {
        state.updatingId = null;
        replaceEverywhere(state, action.payload);
        // A cancelled class is no longer something to turn up to.
        if (action.payload.status === 'cancelled') {
          state.upcoming = state.upcoming.filter((item) => item.id !== action.payload.id);
        }
        toast.success('Class updated');
      })
      .addCase(updateSession.rejected, (state, action) => {
        state.updatingId = null;
        state.error = action.payload?.message ?? 'Could not update this class';
        state.fieldErrors = action.payload?.errors ?? null;
        toast.error(state.error);
      });
  },
});

export const { setSessions, clearSessionError, clearGenerated } = sessionSlice.actions;
export default sessionSlice.reducer;
