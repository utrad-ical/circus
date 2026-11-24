import type {
  Action,
  Dispatch,
  ThunkAction,
  ThunkDispatch,
  UnknownAction
} from '@reduxjs/toolkit';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import loginUser from './loginUser.ts';
import messages from './messages.ts';
import plugins from './plugins.ts';
import searches from './searches.ts';
import users from './users.ts';
import { setStore } from './storeAccess.ts';

const reducer = combineReducers({
  searches,
  loginUser,
  messages,
  plugins,
  users
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
setStore(store);
export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction> &
  Dispatch<UnknownAction>;

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * The thunk action type. See the advanced tutorial of Redux Toolkit.
 */
export type AppThunk = ThunkAction<
  void, // the thunk doesn't return anything
  RootState, // state type for getState
  unknown, // no extra argument
  Action<string> // dispatch will accept this action type
>;
