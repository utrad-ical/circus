import { useState } from 'react';

export const usePreference = (prefName, defaultValue) => {
  const [value, setValue] = useState(() => {
    const savedValue = localStorage.getItem(prefName);
    return savedValue !== null ? JSON.parse(savedValue) : defaultValue;
  });
  const [busy, setBusy] = useState(false);
  const change = async newValue => {
    setValue(newValue);
    setBusy(true);
    localStorage.setItem(prefName, JSON.stringify(newValue));
    setBusy(false);
  };
  return [value, change, busy];
};

export default usePreference;
