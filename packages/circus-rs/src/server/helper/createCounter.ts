import { NoDepFunctionService } from '@utrad-ical/circus-lib';

/**
 * Simple counter that holds how many requests happened during the server is up.
 */
export interface Counter {
  countUp: (key: string) => void;
  getCount: (key: string) => number;
  getCounts: () => { [key: string]: number };
}

const createCounter: NoDepFunctionService<Counter> = async () => {
  const counts = new Map<string, number>();
  const countUp = (key: string) => counts.set(key, (counts.get(key) || 0) + 1);
  const getCount = (key: string) => counts.get(key) || 0;
  const getCounts = () => {
    const results: { [key: string]: number } = {};
    for (const [key, value] of counts.entries()) {
      results[key] = value;
    }
    return results;
  };
  return { countUp, getCount, getCounts };
};

export default createCounter;
