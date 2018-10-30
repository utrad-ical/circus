/**
 * Wait for the specified milliseconds.
 * @param {number} ms
 */
export default async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
