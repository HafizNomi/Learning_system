import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { reportAPI } from '../../api/endpoints';
import { extractErrorMessage } from '../../api/authStorage';

const rejectFrom = (error, fallback) => ({
  errors: error.response?.data ?? null,
  message: extractErrorMessage(error.response?.data, error.message || fallback),
});

const unwrapList = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchReports = createAsyncThunk(
  'reports/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value != null)
      );
      const { data } = await reportAPI.getAll(query);
      return unwrapList(data);
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load reports'));
    }
  }
);

export const fetchReportById = createAsyncThunk(
  'reports/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await reportAPI.getById(id);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load this report'));
    }
  }
);

/**
 * Teacher: write or update the month's report. The endpoint is
 * create-or-update, so sending the same student/course/month twice edits the
 * existing report rather than making a second one. Attendance figures are
 * recalculated server-side from the completed classes.
 */
export const saveReport = createAsyncThunk(
  'reports/save',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await reportAPI.create(payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not save this report'));
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState = {
  items: [],
  current: null,
  loading: false,
  saving: false,
  error: null,
  fieldErrors: null,
};

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearCurrentReport(state) {
      state.current = null;
    },
    clearReportError(state) {
      state.error = null;
      state.fieldErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Could not load reports';
      })

      .addCase(fetchReportById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.loading = false;
        state.current = null;
        state.error = action.payload?.message ?? 'Could not load this report';
      })

      .addCase(saveReport.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(saveReport.fulfilled, (state, action) => {
        state.saving = false;
        state.current = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index === -1) state.items.unshift(action.payload);
        else state.items[index] = action.payload;
        toast.success(
          action.payload.is_finalized
            ? 'Report finalised and visible to the parent'
            : 'Report saved as a draft'
        );
      })
      .addCase(saveReport.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload?.message ?? 'Could not save this report';
        state.fieldErrors = action.payload?.errors ?? null;
        toast.error(state.error);
      });
  },
});

export const { clearCurrentReport, clearReportError } = reportSlice.actions;
export default reportSlice.reducer;
