import { useState, useEffect, useReducer } from 'react';

/**
 * Asynchronously load data from the given async loader function.
 * @param loadFunc The async loader function. The function will be passed
 * an abort signal.
 * @return A tuple containing 1) the loaded data (or undefined or Error),
 * 2) the boolean loading status, and 3) a function to forcibly reload the data.
 */
const useLoadData = <T>(
  loadFunc: (signal: AbortSignal) => Promise<T>
): [T | Error | undefined, boolean, Function] => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // This is used to forcibly refreshing the loading process
  const [counter, reload] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const query = async () => {
      try {
        setIsLoading(true);
        const res = await loadFunc(signal);
        if (!signal.aborted) {
          setIsLoading(false);
          setData(res);
        }
      } catch (err: any) {
        if (!signal.aborted) {
          setData(err);
          setIsLoading(false);
        }
      }
    };
    query();
    return () => controller.abort();
  }, [loadFunc, counter]);

  return [data, isLoading, reload];
};

export default useLoadData;
