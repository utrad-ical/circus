import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '#store/index.ts';
import type { UserPreferences } from '@utrad-ical/circus-api-schema';
import { userPreferencesUpdated } from '#store/loginUser.ts';
import { api } from './api.ts';

/**
 * A React cutsom hook to fetch login user from redux store.
 * This assumes you are using this hook after a successful login.
 */
const useLoginUser = () => useAppSelector(state => state.loginUser.data!);

export const useUserPreferences = (): [
  UserPreferences,
  (updates: UserPreferences) => Promise<void>
] => {
  const preferences = useAppSelector(
    state => state.loginUser.data?.preferences!
  );
  const dispatch = useAppDispatch();
  const updatePreferences = useCallback(
    async (updates: UserPreferences) => {
      dispatch(userPreferencesUpdated({ updates }));
      await api<unknown, UserPreferences>('preferences', {
        method: 'patch',
        data: updates
      });
    },
    [dispatch]
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
