import { createSlice } from '@reduxjs/toolkit'

const sessionSlice = createSlice({
  name: 'sessions',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    setSessions(state, action) {
      state.items = action.payload
    },
  },
})

export const { setSessions } = sessionSlice.actions
export default sessionSlice.reducer
