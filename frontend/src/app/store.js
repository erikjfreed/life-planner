import { configureStore } from '@reduxjs/toolkit';
import undoable, { includeAction } from 'redux-undo';
import timelineReducer from '../features/timeline/timelineSlice';
import parametersReducer from '../features/parameters/parametersSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    parameters: undoable(parametersReducer, {
      filter: includeAction('parameters/update/fulfilled'),
      limit: 50,
    }),
  },
});
