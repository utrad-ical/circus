import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useApi } from 'utils/api';
import { loadUserInfo } from 'actions';

const useUserInfo = (userEmail: string) => {
  const user = useSelector(state => state.user[userEmail]);
  const dispatch = useDispatch();
  const api = useApi();
  useEffect(() => {
    if (!user) dispatch(loadUserInfo(api, userEmail));
  }, [api, dispatch, user, userEmail]);
  return !user || user === 'loading' ? undefined : user;
};

const UserDisplay: React.FC<{ userEmail: string }> = props => {
  const { userEmail } = props;
  const user = useUserInfo(userEmail);
  if (!user) return <>...</>;
  return <span title={user.userEmail}>{user.description}</span>;
};

export default UserDisplay;
