import { useState, useEffect } from 'react';
import cancelToken from './cancelToken';

/**
 * Asynchronously load data from the given async loader function.
 * To reload data, simply pass a different loader function.
 * @param {(cancelToken) => Promise<any>} loadFunc The async loader function
 * that returns the fetched data.
 * The function will be passed a cancellation token.
 */
const useLoadData = loadFunc => {
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(
    () => {
      const token = cancelToken();
      let clearedUp = false;
      let loading = false;
      (async () => {
        try {
          loading = true;
          setIsLoading(true);
          const res = await loadFunc(token);
          if (!clearedUp) {
            loading = false;
            setIsLoading(false);
            setData(res);
          }
        } catch (err) {
          if (!clearedUp) {
            loading = false;
            setData(err);
            setIsLoading(false);
          }
        }
      })();
      return () => {
        clearedUp = true;
        if (loading) token.cancel();
      };
    },
    [loadFunc]
  );
  return [data, isLoading];
};

export default useLoadData;
