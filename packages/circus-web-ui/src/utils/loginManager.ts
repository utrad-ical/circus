import axios from 'axios';
import React, { useContext } from 'react';
import createApiCaller, { ApiCaller, formatCredentials } from './api';
import { Dispatch } from 'redux';
import * as qs from 'querystring';

/**
 * Creates a loginManager.
 * @param apiServer API server root string
 * @param dispatch The redux store's dispatch object
 * @param onApiChange Notification callback
 */
const loginManager = (
  apiServer: string,
  dispatch: Dispatch,
  onApiChange: (api: ApiCaller | null) => void
) => {
  let api: ApiCaller | null = null;

  const restoreApiCaller = () => {
    const credentials = sessionStorage.getItem('tokenCredentials');
    if (credentials) {
      api = createApiCaller(JSON.parse(credentials), apiServer);
      onApiChange(api);
      return true;
    }
  };

  const tryAuthenticate = async (id: string, password: string) => {
    const res = await axios.request({
      method: 'post',
      url: apiServer + 'login',
      data: qs.stringify({
        client_id: 'circus-front',
        client_secret: 'not-a-secret',
        grant_type: 'password',
        username: id,
        password
      })
    });
    const credentials = formatCredentials(res.data);
    api = createApiCaller(credentials, apiServer);
    onApiChange(api);
  };

  /**
   * Loads the user information.
   */
  const refreshUserInfo = async (full = false) => {
    if (!api) throw new Error('Not logged in');
    dispatch({ type: 'REQUEST_LOGIN_INFO' });
    try {
      const result = await api('login-info' + (full ? '/full' : ''), {
        handleErrors: [401]
      });
      if (typeof result.userEmail !== 'string') {
        throw Error('Server did not respond with valid user data');
      }
      if (full) {
        dispatch({ type: 'LOAD_FULL_LOGIN_INFO', loginUser: result });
      } else {
        dispatch({ type: 'CONFIRM_LOGIN_INFO' });
      }
    } catch (err) {
      dispatch({ type: 'LOGGED_OUT' });
    }
  };

  const logout = async () => {
    if (!api) throw new Error('Not logged in');
    await api('logout');
    dispatch({ type: 'LOGGED_OUT' });
    sessionStorage.removeItem('tokenCredentials');
    api = null;
    onApiChange(null);
  };

  return {
    restoreApiCaller,
    tryAuthenticate,
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
