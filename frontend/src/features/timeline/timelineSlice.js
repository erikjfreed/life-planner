import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { updateParameters } from '../parameters/parametersSlice';
import { createEvent, updateEvent, deleteEvent } from '../events/eventsSlice';

export const fetchTimeline = createAsyncThunk('timeline/fetch', async () => {
  const res = await fetch('/lifeplanner/api/timeline');
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
      })
      // Refetch timeline whenever parameters or events change
      .addCase(updateParameters.fulfilled, (state) => { state.status = 'idle'; })
      .addCase(createEvent.fulfilled, (state) => { state.status = 'idle'; })
      .addCase(updateEvent.fulfilled, (state) => { state.status = 'idle'; })
      .addCase(deleteEvent.fulfilled, (state) => { state.status = 'idle'; });
  },
});

export default timelineSlice.reducer;
