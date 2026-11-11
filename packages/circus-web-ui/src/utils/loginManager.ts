import axios from 'axios';
import React, { useContext } from 'react';
import type { ApiCaller } from './api.ts';
import createApiCaller, { csrfHeaders } from './api.ts';
import type { Dispatch } from 'redux';
import * as actions from '#store/loginUser.ts';
import * as searchActions from '#store/searches.ts';

/**
 * Creates a loginManager.
 * The login state is kept in an HttpOnly session cookie set by the API server,
 * so it is shared by all tabs and is not visible from JavaScript.
 * @param apiServer API server root string
 * @param dispatch The redux store's dispatch object
 * @param onApiChange Notification callback
 */
const loginManager = (
  apiServer: string,
  dispatch: Dispatch,
  onApiChange: (api: ApiCaller | null) => void
) => {
  const api = createApiCaller(apiServer);
  onApiChange(api);

  const checkServerIsLive = async () => {
    try {
      const res = await axios.request({
        method: 'get',
        url: apiServer + 'api/status',
        validateStatus: () => true
      });
      return res.status === 200;
    } catch (err: any) {
      return false;
    }
  };

  const startSession = async (
    data: { username: string; password: string } | { onetime: string }
  ) => {
    await axios.post(apiServer + 'api/session', data, {
      headers: csrfHeaders,
      withCredentials: true
    });
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
  const tryOnetimeLogin = async (onetime: string) => {
    await startSession({ onetime });
  };

  /**
   * Loads the user information.
   */
  const refreshUserInfo = async (full = false) => {
    dispatch(actions.loginInfoRequest());
    try {
      const result = await api('login-info' + (full ? '/full' : ''), {
        handleErrors: [401]
      });
      if (typeof result.userEmail !== 'string') {
        throw Error('Server did not respond with valid user data');
      }
      if (full) {
        dispatch(actions.fullLoginInfoLoaded(result));
      } else {
        dispatch(actions.loginInfoConfirmed());
      }
    } catch (err) {
      dispatch(actions.loggedOut());
      dispatch(searchActions.reset());
    }
  };

  const logout = async () => {
    await axios.delete(apiServer + 'api/session', {
      headers: csrfHeaders,
      withCredentials: true
    });
    dispatch(actions.loggedOut());
    dispatch(searchActions.reset());
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
