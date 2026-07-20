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

const courseSlice = createSlice({
  name: 'courses',
  initialState: {
    courses: [],
    loading: false,
    error: null,
  },
  reducers: {
    setCourses(state, action) {
      state.courses = action.payload
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
  },
})

export const { setCourses } = courseSlice.actions
export default courseSlice.reducer
