import { createSlice } from '@reduxjs/toolkit'

const applicationSlice = createSlice({
  name: 'applications',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    setApplications(state, action) {
      state.items = action.payload
    },
  },
})

export const { setApplications } = applicationSlice.actions
export default applicationSlice.reducer
