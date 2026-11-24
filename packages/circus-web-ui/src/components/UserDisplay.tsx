import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '#store/index.ts';
import { api } from '#utils/api.ts';
import { loadUserInfo } from '#store/users.ts';

const useUserInfo = (userEmail: string) => {
  const user = useAppSelector(state => state.users[userEmail]);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!user) dispatch(loadUserInfo(userEmail));
  }, [dispatch, user, userEmail]);
  return !user || user === 'loading' ? undefined : user;
};

const UserDisplay: React.FC<{ userEmail: string }> = props => {
  const { userEmail } = props;
  const user = useUserInfo(userEmail);
  if (!user) return <>...</>;
  return <span title={user.userEmail}>{user.description}</span>;
};

export default UserDisplay;
