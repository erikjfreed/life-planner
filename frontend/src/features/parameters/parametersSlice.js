import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchParameters = createAsyncThunk('parameters/fetch', async () => {
  const res = await fetch('/api/parameters');
  return res.json();
});

export const updateParameters = createAsyncThunk('parameters/update', async (updates) => {
  const res = await fetch('/api/parameters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
});

const parametersSlice = createSlice({
  name: 'parameters',
  initialState: { values: {}, status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchParameters.fulfilled, (state, action) => {
        state.values = action.payload;
        state.status = 'succeeded';
      })
      .addCase(updateParameters.fulfilled, (state, action) => {
        state.values = action.payload;
      });
  },
});

export default parametersSlice.reducer;
