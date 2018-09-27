/**
 * Validator function which checks the input is
 * a valid UID (eg, series instance UID)
 */
export function isDicomUid(input: string): boolean {
  return (
    typeof input === 'string' &&
    !!input.match(/^((0|[1-9]\d*)\.)+(0|[1-9]\d*)$/) &&
    input.length <= 64
  );
}
