import { api, tryAuthenticate } from 'utils/api';
import browserHistory from 'browserHistory';

/**
 * Loads the user information.
 */
export function refreshUserInfo(full = false) {
  return async dispatch => {
    dispatch({ type: 'REQUEST_LOGIN_INFO' });
    let result;
    try {
      result = await api('login-info' + (full ? '/full' : ''), {
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
}

export function login(id, password) {
  return async dispatch => {
    await tryAuthenticate(id, password);
    await dispatch(refreshUserInfo(true));
    browserHistory.push('/home');
  };
}

export function logout() {
  return async dispatch => {
    await api('logout');
    dispatch({ type: 'LOGGED_OUT' });
    sessionStorage.removeItem('tokenCredentials');
    browserHistory.push('/');
  };
}
