import { isDicomUid } from '@utrad-ical/circus-lib/validation';
import semver from 'semver';
import { z } from 'zod';

// String formats shared by the schemas

export const dicomUid = () =>
  z.string().refine(s => isDicomUid(s, false), 'Invalid DICOM UID');

const intOrRange = '((0|[1-9][0-9]*)|(0|[1-9][0-9]*)-(0|[1-9][0-9]*))';

export const multiIntegerRange = () =>
  z.string().regex(new RegExp(`^${intOrRange}(,${intOrRange})*$`));

export const color = () => z.string().regex(/^#[0-9a-f]{6}$/);

export const kebab = () => z.string().regex(/^([a-z0-9]+-)*[a-z0-9]+$/);

export const sha1hex = () => z.string().regex(/^[a-f0-9]{40}$/);

export const dockerId = () => z.string().regex(/^[a-z0-9]{64}$/);

export const semverString = () =>
  z.string().refine(s => semver.valid(s) !== null, 'Invalid semver');

interface Range {
  min?: number;
  max?: number;
}

// `!(v < undefined)` is true, so missing bounds always pass
const inRange = (v: number, { min, max }: Range) => !(v < min!) && !(v > max!);

const rangeText = ({ min, max }: Range) =>
  (min !== undefined ? ` >= ${min}` : '') +
  (max !== undefined ? ` <= ${max}` : '');

/**
 * A number, checked like `type: number` in the old JSON Schemas.
 * Unlike `z.number()`, NaN and Infinity pass (NaN can come from DICOM parsing).
 */
export const num = (range: Range = {}) =>
  z.custom<number>(
    v => typeof v === 'number' && inRange(v, range),
    'Expected a number' + rangeText(range)
  );

/**
 * Any object (`type: object` in JSON Schema).
 */
export const anyObject = () => z.record(z.string(), z.unknown());

// A date, optionally with time and offset (e.g., '2020-01-31T12:34:56.789Z')
const isoDateRegex =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * A date, which is a `Date` in the server and an ISO string in JSON.
 * Parsing (requests) converts strings into `Date`s,
 * and encoding (responses) converts `Date`s into strings.
 */
export const dateField = () =>
  z.codec(
    z
      .string()
      .regex(isoDateRegex)
      .refine(s => !isNaN(new Date(s).getTime()), 'Invalid date'),
    // Any Date passes, including an invalid one (as before)
    z.custom<Date>(v => v instanceof Date, 'Expected a Date'),
    {
      decode: s => new Date(s),
      encode: d => d.toISOString()
    }
  );
