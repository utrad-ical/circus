import { useCallback, useLayoutEffect, useRef } from 'react';

type Handler<P extends unknown[], R> = (...args: P) => R;

const useEffectEvent = <P extends unknown[], R>(
  handler: Handler<P, R>
): Handler<P, R> => {
  const handlerRef = useRef<Handler<P, R> | null>(null);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return useCallback((...args: P): R => {
    return handlerRef.current!(...args);
  }, []);
};

export default useEffectEvent;
