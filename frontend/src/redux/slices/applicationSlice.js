import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { applicationAPI } from '../../api/endpoints';
import { extractErrorMessage } from '../../api/authStorage';
import { rememberApplication, updateRememberedStatus } from '../../api/applicationStorage';

/** Shared rejection shape: the raw DRF body plus a display-ready message. */
const rejectFrom = (error, fallback) => ({
  errors: error.response?.data ?? null,
  message: extractErrorMessage(error.response?.data, error.message || fallback),
  status: error.response?.status ?? null,
});

/** DRF pagination is on globally (PAGE_SIZE 20), so unwrap `results`. */
const unwrapList = (data) => ({
  items: Array.isArray(data) ? data : (data?.results ?? []),
  count: Array.isArray(data) ? data.length : (data?.count ?? 0),
  hasNext: Boolean(data?.next),
});

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

/** Public: submit the apply-for-a-course form. No auth required. */
export const submitApplication = createAsyncThunk(
  'applications/submit',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await applicationAPI.submit(payload);
      // Keep a local receipt so the applicant can find this again after they
      // close the tab - the read endpoint needs a login they may not have yet.
      if (data.application) rememberApplication(data.application);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not submit your application'));
    }
  }
);

/** Admin: the full list, with `?status=&course=&search=&page=` filters. */
export const fetchApplications = createAsyncThunk(
  'applications/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      // Drop empty filters so we don't send `?status=` and match nothing.
      const query = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value != null)
      );
      const { data } = await applicationAPI.getAll(query);
      return unwrapList(data);
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load applications'));
    }
  }
);

/** The signed-in user's own applications. */
export const fetchMyApplications = createAsyncThunk(
  'applications/fetchMine',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await applicationAPI.getMine();
      return unwrapList(data);
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load your applications'));
    }
  }
);

/**
 * One application by id. A 403/404 here is expected for an anonymous visitor
 * holding only a local receipt, so the page - not a toast - explains it.
 */
export const fetchApplicationById = createAsyncThunk(
  'applications/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await applicationAPI.getById(id);
      updateRememberedStatus(data.id, data.status);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load this application'));
    }
  }
);

/** Admin: approve, reject, or otherwise move an application along. */
export const updateApplicationStatus = createAsyncThunk(
  'applications/updateStatus',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await applicationAPI.updateStatus(id, payload);
      return { application: data.application, message: data.message };
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not update this application'));
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState = {
  items: [],
  count: 0,
  hasNext: false,
  current: null,
  // The record returned by the last successful submit, so the page that
  // follows the redirect can greet the applicant by name.
  lastSubmitted: null,
  filters: { status: '', course: '', search: '', page: 1 },
  loading: false,
  submitting: false,
  updatingId: null,
  error: null,
  // Field-keyed DRF errors, rendered next to the offending input.
  fieldErrors: null,
};

const pending = (state) => {
  state.loading = true;
  state.error = null;
};

const failed = (state, action, { silent = false } = {}) => {
  state.loading = false;
  state.error = action.payload?.message ?? 'Something went wrong';
  if (!silent) toast.error(state.error);
};

/** Keep the list and the open record in step after a status change. */
const replaceInList = (state, application) => {
  const index = state.items.findIndex((item) => item.id === application.id);
  if (index !== -1) state.items[index] = application;
  if (state.current?.id === application.id) state.current = application;
};

const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setApplications(state, action) {
      state.items = action.payload;
    },
    setFilters(state, action) {
      // Any filter change resets paging - page 3 of the old filter is meaningless.
      const next = { ...state.filters, ...action.payload };
      state.filters = 'page' in action.payload ? next : { ...next, page: 1 };
    },
    clearFilters(state) {
      state.filters = initialState.filters;
    },
    clearCurrent(state) {
      state.current = null;
      state.error = null;
    },
    clearApplicationError(state) {
      state.error = null;
      state.fieldErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Submit ---
      .addCase(submitApplication.pending, (state) => {
        state.submitting = true;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(submitApplication.fulfilled, (state, action) => {
        state.submitting = false;
        state.lastSubmitted = action.payload.application ?? null;
        if (action.payload.application) state.current = action.payload.application;
        toast.success(action.payload.message || 'Application submitted successfully!');
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload?.message ?? 'Could not submit your application';
        state.fieldErrors = action.payload?.errors ?? null;
        // Validation errors land on the fields; anything else needs a toast.
        if (action.payload?.status !== 400) toast.error(state.error);
      })

      // --- Admin list ---
      .addCase(fetchApplications.pending, pending)
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.count = action.payload.count;
        state.hasNext = action.payload.hasNext;
      })
      .addCase(fetchApplications.rejected, (state, action) => failed(state, action, { silent: true }))

      // --- My applications ---
      .addCase(fetchMyApplications.pending, pending)
      .addCase(fetchMyApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.count = action.payload.count;
      })
      .addCase(fetchMyApplications.rejected, (state, action) => failed(state, action, { silent: true }))

      // --- Single application (the page renders the failure itself) ---
      .addCase(fetchApplicationById.pending, pending)
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchApplicationById.rejected, (state, action) => {
        state.loading = false;
        state.current = null;
        state.error = action.payload?.message ?? 'Could not load this application';
      })

      // --- Status update ---
      .addCase(updateApplicationStatus.pending, (state, action) => {
        state.updatingId = action.meta.arg.id;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(updateApplicationStatus.fulfilled, (state, action) => {
        state.updatingId = null;
        if (action.payload.application) replaceInList(state, action.payload.application);
        toast.success(action.payload.message || 'Application updated');
      })
      .addCase(updateApplicationStatus.rejected, (state, action) => {
        state.updatingId = null;
        state.error = action.payload?.message ?? 'Could not update this application';
        state.fieldErrors = action.payload?.errors ?? null;
        toast.error(state.error);
      });
  },
});

export const {
  setApplications,
  setFilters,
  clearFilters,
  clearCurrent,
  clearApplicationError,
} = applicationSlice.actions;

export default applicationSlice.reducer;
