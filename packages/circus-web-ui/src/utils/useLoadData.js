import { useState, useEffect, useReducer } from 'react';
import cancelToken from './cancelToken';

/**
 * Asynchronously load data from the given async loader function.
 * @param {*} loadFunc The async loader function. The function will be passed
 * a cancel token.
 * @return {[any, ()=>void, ()=>void]}
 */
const useLoadData = loadFunc => {
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // This is used to forcibly refreshing the loading process
  const [counter, reload] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const token = cancelToken();
    let clearedUp = false;
    let loading = false;
    const query = async () => {
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
    };
    query();
    return () => {
      clearedUp = true;
      if (loading) token.cancel();
    };
  }, [loadFunc, counter]);

  return [data, isLoading, reload];
};

export default useLoadData;
