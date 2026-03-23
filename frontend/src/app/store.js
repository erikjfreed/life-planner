import { configureStore } from '@reduxjs/toolkit';
import timelineReducer from '../features/timeline/timelineSlice';
import parametersReducer from '../features/parameters/parametersSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    parameters: parametersReducer,
  },
});
