import { createSlice } from '@reduxjs/toolkit'

const paymentSlice = createSlice({
  name: 'payments',
  initialState: {
    history: [],
    loading: false,
    error: null,
  },
  reducers: {
    setPaymentHistory(state, action) {
      state.history = action.payload
    },
  },
})

export const { setPaymentHistory } = paymentSlice.actions
export default paymentSlice.reducer
