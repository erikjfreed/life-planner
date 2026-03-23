import { configureStore } from '@reduxjs/toolkit';
import undoable, { includeAction } from 'redux-undo';
import timelineReducer from '../features/timeline/timelineSlice';
import parametersReducer from '../features/parameters/parametersSlice';
import eventsReducer from '../features/events/eventsSlice';
import entitiesReducer from '../features/entities/entitiesSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    parameters: undoable(parametersReducer, {
      filter: includeAction('parameters/update/fulfilled'),
      limit: 50,
    }),
    events: eventsReducer,
    entities: entitiesReducer,
  },
});
