import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { courseAPI } from '../../api/endpoints'

export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await courseAPI.getAll(filters)
      return response.data?.results ?? response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to load courses')
    }
  }
)

/** One course, for the detail page. */
export const fetchCourseById = createAsyncThunk(
  'courses/fetchCourseById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await courseAPI.getById(id)
      return data
    } catch (error) {
      // 404 means the course was deactivated or the link is wrong; the page
      // shows a "not found" state rather than a generic failure.
      return rejectWithValue({
        notFound: error.response?.status === 404,
        message: error.response?.data?.detail || 'Could not load this course',
      })
    }
  }
)

const courseSlice = createSlice({
  name: 'courses',
  initialState: {
    courses: [],
    loading: false,
    error: null,
    selected: null,
    selectedLoading: false,
    selectedError: null,
  },
  reducers: {
    setCourses(state, action) {
      state.courses = action.payload
    },
    clearSelectedCourse(state) {
      state.selected = null
      state.selectedError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false
        state.courses = action.payload
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(fetchCourseById.pending, (state) => {
        state.selectedLoading = true
        state.selectedError = null
        state.selected = null
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.selectedLoading = false
        state.selected = action.payload
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.selectedLoading = false
        state.selectedError = action.payload
      })
  },
})

export const { setCourses, clearSelectedCourse } = courseSlice.actions
export default courseSlice.reducer
