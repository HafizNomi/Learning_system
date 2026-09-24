import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { attendanceAPI } from '../../api/endpoints';
import { extractErrorMessage } from '../../api/authStorage';
import { fetchAllPages } from '../../api/pagination';

const rejectFrom = (error, fallback) => ({
  errors: error.response?.data ?? null,
  message: extractErrorMessage(error.response?.data, error.message || fallback),
});

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

/**
 * Teacher: record who turned up. This also flips the class to `completed` and
 * recalculates the student's monthly summary server-side, so both lists are
 * refetched afterwards rather than patched by hand.
 */
export const markAttendance = createAsyncThunk(
  'attendance/mark',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await attendanceAPI.mark(payload);
      return data;
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not save attendance'));
    }
  }
);

export const fetchMonthlySummary = createAsyncThunk(
  'attendance/fetchSummary',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchAllPages(attendanceAPI.getMonthlySummary, params);
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load attendance'));
    }
  }
);

export const fetchStudentAttendance = createAsyncThunk(
  'attendance/fetchStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      return await fetchAllPages(
        (params) => attendanceAPI.getStudentAttendance(studentId, params),
      );
    } catch (error) {
      return rejectWithValue(rejectFrom(error, 'Could not load attendance records'));
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState = {
  records: [],
  summaries: [],
  loading: false,
  saving: false,
  error: null,
  fieldErrors: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setAttendance(state, action) {
      state.records = action.payload;
    },
    clearAttendanceError(state) {
      state.error = null;
      state.fieldErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(markAttendance.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(markAttendance.fulfilled, (state, action) => {
        state.saving = false;
        const record = action.payload.attendance;
        if (record) {
          const index = state.records.findIndex((item) => item.id === record.id);
          if (index === -1) state.records.unshift(record);
          else state.records[index] = record;
        }
        toast.success(action.payload.message || 'Attendance saved');
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload?.message ?? 'Could not save attendance';
        state.fieldErrors = action.payload?.errors ?? null;
        toast.error(state.error);
      })

      .addCase(fetchMonthlySummary.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMonthlySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summaries = action.payload;
      })
      .addCase(fetchMonthlySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Could not load attendance';
      })

      .addCase(fetchStudentAttendance.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStudentAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
      })
      .addCase(fetchStudentAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Could not load attendance records';
      });
  },
});

export const { setAttendance, clearAttendanceError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
