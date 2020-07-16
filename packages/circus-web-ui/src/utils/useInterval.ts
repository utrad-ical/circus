import { useEffect, useRef } from 'react';

/**
 * Custom hook to invoke the given callback with the specified interval.
 * See: https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
const useInterval = (callback: () => void, intervalMs: number | null) => {
  const savedCallback = useRef<Function>();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    const tick = () => {
      savedCallback.current!();
    };
    if (intervalMs !== null && intervalMs > 0) {
      const id = setInterval(tick, intervalMs);
      return () => clearInterval(id);
    }
  }, [intervalMs]);
};

export default useInterval;
