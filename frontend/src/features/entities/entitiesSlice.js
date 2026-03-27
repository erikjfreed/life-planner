import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchEntities = createAsyncThunk('entities/fetch', async () => {
  const res = await fetch('/lifeplanner/api/entities');
  return res.json();
});

export const createEntity = createAsyncThunk('entities/create', async (entity) => {
  const res = await fetch('/lifeplanner/api/entities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entity)
  });
  return res.json();
});

export const updateEntity = createAsyncThunk('entities/update', async ({ id, ...data }) => {
  const res = await fetch(`/lifeplanner/api/entities/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  return res.json();
});

export const deleteEntity = createAsyncThunk('entities/delete', async (id) => {
  const res = await fetch(`/lifeplanner/api/entities/${id}`, { method: 'DELETE' });
  return res.json();
});

const entitiesSlice = createSlice({
  name: 'entities',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    const setLoaded = (state, action) => { state.items = action.payload; state.status = 'succeeded'; };
    builder
      .addCase(fetchEntities.fulfilled, setLoaded)
      .addCase(createEntity.fulfilled, setLoaded)
      .addCase(updateEntity.fulfilled, setLoaded)
      .addCase(deleteEntity.fulfilled, setLoaded)
      .addMatcher(action => action.type.startsWith('entities/') && action.type.endsWith('/pending'),
        state => { state.status = 'loading'; });
  },
});

export default entitiesSlice.reducer;
