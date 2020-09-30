import { useEffect } from 'react';

const useKeyboardShortcut = (key: string | undefined, callback: Function) => {
  useEffect(() => {
    if (!key) return;
    const keys = key.split(' ');
    const handler = (ev: KeyboardEvent) => {
      if (
        ev.target instanceof HTMLInputElement ||
        ev.target instanceof HTMLTextAreaElement
      )
        return;
      if (keys.includes(ev.code)) callback();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [key, callback]);
};

export default useKeyboardShortcut;
