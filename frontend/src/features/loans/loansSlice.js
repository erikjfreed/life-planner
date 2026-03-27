import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchLoans = createAsyncThunk('loans/fetch', async () => {
  const res = await fetch('/api/loans');
  return res.json();
});

export const createLoan = createAsyncThunk('loans/create', async (loan) => {
  const res = await fetch('/api/loans', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loan)
  });
  return res.json();
});

export const updateLoan = createAsyncThunk('loans/update', async ({ id, ...data }) => {
  const res = await fetch(`/api/loans/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  return res.json();
});

export const deleteLoan = createAsyncThunk('loans/delete', async (id) => {
  const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
  return res.json();
});

const loansSlice = createSlice({
  name: 'loans',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    const setLoaded = (state, action) => { state.items = action.payload; state.status = 'succeeded'; };
    builder
      .addCase(fetchLoans.fulfilled, setLoaded)
      .addCase(createLoan.fulfilled, setLoaded)
      .addCase(updateLoan.fulfilled, setLoaded)
      .addCase(deleteLoan.fulfilled, setLoaded);
  },
});

export default loansSlice.reducer;
