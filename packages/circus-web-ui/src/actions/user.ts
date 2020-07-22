import { ApiCaller } from 'utils/api';
import { DefaultRootState } from 'react-redux';

export const loadUserInfo = (api: ApiCaller, userEmail: string) => {
  return async (dispatch: any, getState: () => DefaultRootState) => {
    const state = getState();
    if (state.user[userEmail]) return;
    dispatch({
      type: 'LOADING_USER_INFO',
      userEmail
    });
    const userData = await api(`users/${userEmail}`);
    dispatch({
      type: 'LOAD_USER_INFO',
      userEmail,
      data: userData
    });
  };
};
