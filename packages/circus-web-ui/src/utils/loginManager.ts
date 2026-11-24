import React, { useContext } from 'react';
import { createApiCaller } from './api.ts';
import {
  broadcastSessionChange,
  isSessionUserChangedError
} from './sessionUserCheck.ts';
import type { Dispatch } from '@reduxjs/toolkit';
import type {
  LoginInfo,
  LoginInfoFull,
  SessionCreate
} from '@utrad-ical/circus-api-schema';
import * as actions from '#store/loginUser.ts';
import * as searchActions from '#store/searches.ts';

/**
 * Creates a loginManager.
 * The login state is kept in an HttpOnly session cookie set by the API server,
 * so it is shared by all tabs and is not visible from JavaScript.
 * @param apiServer API server root string
 * @param dispatch The redux store's dispatch object
 */
const loginManager = (apiServer: string, dispatch: Dispatch) => {
  const api = createApiCaller(apiServer);
  const sessionOptions = { checkUser: false, handleErrors: true };

  const checkServerIsLive = async () => {
    try {
      const res = await fetch(api.getBaseUrl() + 'status');
      await res.body?.cancel();
      return res.status === 200;
    } catch {
      return false;
    }
  };

  const startSession = async (data: SessionCreate) => {
    await api<unknown, SessionCreate>('session', {
      ...sessionOptions,
      method: 'POST',
      data
    });
    // Learn who we are now, and tell other tabs
    const userEmail = await loadUserInfo(true);
    if (userEmail) broadcastSessionChange(userEmail);
  };

  /**
   * Logs in with a user name and a password.
   */
  const tryAuthenticate = async (id: string, password: string) => {
    await startSession({ username: id, password });
  };

  /**
   * Logs in with a onetime password (onetime URL).
   * This replaces the session of the current user, if any.
   */
  const onetimeLogins = new Map<string, Promise<void>>();
  const tryOnetimeLogin = (onetime: string) => {
    // A onetime password works only once, so share the request in progress
    const existing = onetimeLogins.get(onetime);
    if (existing) return existing;
    const promise = startSession({ onetime }).finally(() =>
      onetimeLogins.delete(onetime)
    );
    onetimeLogins.set(onetime, promise);
    return promise;
  };

  const loadUserInfo = async (full: boolean): Promise<string | undefined> => {
    dispatch(actions.loginInfoRequest());
    try {
      const options = {
        handleErrors: [401],
        // Loading the full info (re)establishes the user of this tab
        checkUser: !full
      };
      const result = full
        ? {
            full: true as const,
            user: await api<LoginInfoFull>('login-info/full', options)
          }
        : {
            full: false as const,
            user: await api<LoginInfo>('login-info', options)
          };
      if (typeof result.user.userEmail !== 'string') {
        throw Error('Server did not respond with valid user data');
      }
      if (result.full) {
        dispatch(actions.fullLoginInfoLoaded(result.user));
      } else {
        dispatch(actions.loginInfoConfirmed());
      }
      return result.user.userEmail;
    } catch (err) {
      // Keep the state of this tab; the user is asked to reload the page
      if (isSessionUserChangedError(err)) return;
      dispatch(actions.loggedOut());
      dispatch(searchActions.reset());
    }
  };

  const inFlight = new Map<boolean, Promise<string | undefined>>();

  /**
   * Loads the user information.
   * Shares the request in progress, such as one from an effect run twice.
   */
  const refreshUserInfo = (full = false) => {
    const existing = inFlight.get(full);
    if (existing) return existing;
    const promise = loadUserInfo(full).finally(() => inFlight.delete(full));
    inFlight.set(full, promise);
    return promise;
  };

  const logout = async () => {
    await api('session', { ...sessionOptions, method: 'DELETE' });
    dispatch(actions.loggedOut());
    dispatch(searchActions.reset());
    broadcastSessionChange(null);
  };

  return {
    checkServerIsLive,
    tryAuthenticate,
    tryOnetimeLogin,
    refreshUserInfo,
    logout
  };
};

export default loginManager;

export const LoginManagerContext = React.createContext<ReturnType<
  typeof loginManager
> | null>(null);

export const useLoginManager = () => {
  return useContext(LoginManagerContext)!;
};
