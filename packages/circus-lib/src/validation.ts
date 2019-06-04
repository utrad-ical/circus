/**
 * Validator function which checks the input is
 * a valid UID (eg, series instance UID).
 * @param input The input string.
 * @param strict If false, nonstandard components like `00` will be accepted.
 */
export function isDicomUid(input: string, strict: boolean = false): boolean {
  const reg = strict
    ? /^((0|[1-9]\d*)\.)+(0|[1-9]\d*)$/
    : /^[0-9]+(\.[0-9]+)+$/;
  return typeof input === 'string' && reg.test(input) && input.length <= 64;
}
