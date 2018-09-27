/**
 * Promisified version of setTimeout() that resolves
 * after the specified milliseconds.
 * @param ms The milliseconds to wait for.
 */
export default async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
