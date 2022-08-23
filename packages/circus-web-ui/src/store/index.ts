import { Action, configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { ThunkAction } from 'redux-thunk';
import searches from './searches';
import loginUser from './loginUser';
import messages from './messages';
import plugins from './plugins';
import users from './users';
import taskProgress from './taskProgress';

const reducer = combineReducers({
  searches,
  loginUser,
  messages,
  plugins,
  users,
  taskProgress
});

export const store = configureStore({
  reducer,
  // turnoff warnings by non-serializable value (type of message in messages/addMessage is React.ReactChild)
  // https://redux-toolkit.js.org/usage/usage-guide#working-with-non-serializable-data
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['messages/addMessage'],
        // Ignore these paths in the state
        ignoredPaths: ['messages']
      }
    })
});
export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = typeof dispatch;

/**
 * The thunk action type. See the advanced tutorial of Redux Toolkit.
 */
export type AppThunk = ThunkAction<
  void, // the thunk doesn't return anything
  RootState, // state type for getState
  unknown, // no extra argument
  Action<string> // dispatch will accept this action type
>;
