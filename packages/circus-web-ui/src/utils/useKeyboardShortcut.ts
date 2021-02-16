import { useEffect, useMemo } from 'react';

interface HotKey {
  key: string; // 'A' - 'Z'
  shiftKey: boolean;
  ctrlKey: boolean;
}

const parse = (str: string | undefined) => {
  if (!str) return [];
  const result: HotKey[] = [];
  for (const def of str.split(/,?\s+/)) {
    result.push({
      key: def.substr(-1).toUpperCase(),
      shiftKey: /shift/i.test(def),
      ctrlKey: /ctrl/i.test(def)
    });
  }
  return result;
};

const useKeyboardShortcut = (key: string | undefined, callback: Function) => {
  const hotKeys = useMemo(() => parse(key), [key]);

  useEffect(() => {
    if (!key) return;
    const handler = (ev: KeyboardEvent) => {
      if (
        ev.target instanceof HTMLInputElement ||
        ev.target instanceof HTMLTextAreaElement
      )
        return;
      for (const hotKey of hotKeys) {
        if (
          hotKey.shiftKey === ev.shiftKey &&
          hotKey.ctrlKey === ev.ctrlKey &&
          hotKey.key === ev.key.toUpperCase()
        ) {
          ev.preventDefault();
          callback();
          break;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [key, callback, hotKeys]);
};

export default useKeyboardShortcut;
