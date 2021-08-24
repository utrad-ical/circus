import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UserPreferences, userPreferencesUpdated } from 'store/loginUser';
import { useApi } from './api';

/**
 * A React cutsom hook to fetch login user from redux store.
 * This assumes you are using this hook after a successful login.
 */
const useLoginUser = () => useSelector(state => state.loginUser.data!);

export const useUserPreferences = (): [
  UserPreferences,
  (updates: Partial<UserPreferences>) => Promise<void>
] => {
  const preferences = useSelector(state => state.loginUser.data?.preferences!);
  const api = useApi();
  const dispatch = useDispatch();
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      dispatch(userPreferencesUpdated({ updates }));
      await api('preferences', {
        method: 'patch',
        data: updates
      });
    },
    [api, dispatch]
  );

  return [preferences, updatePreferences];
};

export const useUserPreference = <T extends keyof UserPreferences>(
  key: T
): [UserPreferences[T], (value: UserPreferences[T]) => Promise<void>] => {
  const [preferences, updatePreferences] = useUserPreferences();
  const value = preferences[key];

  const setValue = useCallback(
    (value: UserPreferences[T]) => updatePreferences({ [key]: value }),
    [key, updatePreferences]
  );

  return [value, setValue];
};

export default useLoginUser;
