/**
 * Wait for the specified milliseconds.
 * @param ms THe time to wait for, in milliseconds.
 */
const delay = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export default delay;
