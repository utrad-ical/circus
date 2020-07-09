import { useState } from 'react';

/**
 * A hook which provides access to localStorage-based preference.
 */
export const useLocalPreference = <T>(
  prefName: string,
  defaultValue: T
): [T, (newValue: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    const savedValue = localStorage.getItem(prefName);
    return savedValue !== null ? JSON.parse(savedValue) : defaultValue;
  });
  const change = async (newValue: T) => {
    setValue(newValue);
    localStorage.setItem(prefName, JSON.stringify(newValue));
  };
  return [value, change];
};

export default useLocalPreference;
