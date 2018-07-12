/**
 * Returns true if the given string looks like a valid DICOM UID.
 * @param checkStr The string to be checked.
 */
export default function isDicomUid(checkStr: string): boolean {
  return (
    typeof checkStr === 'string' &&
    checkStr.length <= 64 &&
    /^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))+$/.test(checkStr)
  );
}
