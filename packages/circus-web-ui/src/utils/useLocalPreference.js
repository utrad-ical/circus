import { useState } from 'react';

/**
 * A hook which provides access to localStorage-based preference.
 */
export const useLocalPreference = (prefName, defaultValue) => {
  const [value, setValue] = useState(() => {
    const savedValue = localStorage.getItem(prefName);
    return savedValue !== null ? JSON.parse(savedValue) : defaultValue;
  });
  const change = async newValue => {
    setValue(newValue);
    localStorage.setItem(prefName, JSON.stringify(newValue));
  };
  return [value, change];
};

export default useLocalPreference;
