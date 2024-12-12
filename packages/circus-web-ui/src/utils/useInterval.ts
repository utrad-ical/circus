import { useEffect } from 'react';
import useEffectEvent from './useEffectEvent';

/**
 * Custom hook to invoke the given callback with the specified interval.
 * See: https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
const useInterval = (callback: () => void, intervalMs: number | null) => {
  // Remember the latest callback
  const savedCallback = useEffectEvent(() => callback());

  // Set up the interval
  useEffect(() => {
    const tick = () => savedCallback();
    if (intervalMs !== null && intervalMs > 0) {
      const id = setInterval(tick, intervalMs);
      return () => clearInterval(id);
    }
  }, [intervalMs, savedCallback]);
};

export default useInterval;
