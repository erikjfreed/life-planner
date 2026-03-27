import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchEvents = createAsyncThunk('events/fetch', async () => {
  const res = await fetch('/lifeplanner/api/events');
  return res.json();
});

export const createEvent = createAsyncThunk('events/create', async (event) => {
  const res = await fetch('/lifeplanner/api/events', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event)
  });
  return res.json();
});

export const updateEvent = createAsyncThunk('events/update', async ({ id, ...data }) => {
  const res = await fetch(`/lifeplanner/api/events/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  return res.json();
});

export const deleteEvent = createAsyncThunk('events/delete', async (id) => {
  const res = await fetch(`/lifeplanner/api/events/${id}`, { method: 'DELETE' });
  return res.json();
});

const eventsSlice = createSlice({
  name: 'events',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    const setLoaded = (state, action) => { state.items = action.payload; state.status = 'succeeded'; };
    builder
      .addCase(fetchEvents.fulfilled, setLoaded)
      .addCase(createEvent.fulfilled, setLoaded)
      .addCase(updateEvent.fulfilled, setLoaded)
      .addCase(deleteEvent.fulfilled, setLoaded)
      .addMatcher(action => action.type.startsWith('events/') && action.type.endsWith('/pending'),
        state => { state.status = 'loading'; });
  },
});

export default eventsSlice.reducer;
