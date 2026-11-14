import type { store } from './index.ts';

// Lets modules that the slices depend on (e.g., the API caller) use the store
// without importing it, which would make a circular import
let current: typeof store | undefined;

export const setStore = (s: typeof store) => {
  current = s;
};

export const getStore = () => current!;
