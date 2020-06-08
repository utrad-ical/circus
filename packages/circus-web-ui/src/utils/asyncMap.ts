/**
 * Like Array#map(), but for an async function.
 */
const asyncMap = async <T, S>(array: T[], mapFunc: (item: T) => Promise<S>) => {
  return Promise.all(array.map(async item => await mapFunc(item)));
};

export default asyncMap;
