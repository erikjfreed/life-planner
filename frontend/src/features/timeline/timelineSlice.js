import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchTimeline = createAsyncThunk('timeline/fetch', async () => {
  const res = await fetch('http://localhost:3001/api/timeline');
  return res.json();
});

const timelineSlice = createSlice({
  name: 'timeline',
  initialState: { rows: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimeline.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchTimeline.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.rows = action.payload;
      })
      .addCase(fetchTimeline.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default timelineSlice.reducer;
