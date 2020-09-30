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

export const store = configureStore({ reducer });
export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof reducer>;

/**
 * The thunk action type. See the advanced tutorial of Redux Toolkit.
 */
export type AppThunk = ThunkAction<
  void, // the thunk doesn't return anything
  RootState, // state type for getState
  unknown, // no extra argument
  Action<string> // dispatch will accept this action type
>;
