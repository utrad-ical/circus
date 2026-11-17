import type { NoDepFunctionService } from '@utrad-ical/circus-lib';
import { z } from 'zod';
import type { ValidationMode, Validator } from './interface.ts';

export interface ValidationIssue {
  /** The path to the invalid value, e.g., `['domains', 0]` */
  path: (string | number)[];
  message: string;
  code: string;
}

/** Formats a path like `domains[0].name` */
export const formatPath = (path: (string | number)[]) =>
  path
    .map((p, i) => (typeof p === 'number' ? `[${p}]` : i ? `.${p}` : p))
    .join('') || '(root)';

/**
 * Thrown when the data does not match the schema.
 */
export class ValidationError extends Error {
  issues: ValidationIssue[];
  /** Set by validateInOut */
  phase?: 'request' | 'response';

  constructor(issues: ValidationIssue[]) {
    super(
      'Validation failed: ' +
        issues.map(i => `${formatPath(i.path)}: ${i.message}`).join(', ')
    );
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

type Issue = z.core.$ZodIssue;

/**
 * Replaces a union error with the issues of its closest alternative,
 * so that each issue keeps the path to the invalid value.
 */
const expandUnions = (issues: Issue[], prefix: PropertyKey[] = []): Issue[] =>
  issues.flatMap(issue => {
    const path = [...prefix, ...issue.path];
    if (issue.code === 'invalid_union' && issue.errors.length) {
      // Fewest issues first, then fewest unknown keys (more keys matched)
      const score = (errors: Issue[]) =>
        errors.length * 1000 +
        errors.filter(e => e.code === 'unrecognized_keys').length;
      const closest = issue.errors.reduce((a, b) =>
        score(b) < score(a) ? b : a
      );
      return expandUnions(closest, path);
    }
    return [{ ...issue, path } as Issue];
  });

const toValidationIssues = (issues: Issue[]): ValidationIssue[] =>
  issues.flatMap((issue): ValidationIssue[] => {
    const path = issue.path.map(p => (typeof p === 'number' ? p : String(p)));
    // Points to each unknown key itself
    if (issue.code === 'unrecognized_keys')
      return issue.keys.map(key => ({
        path: [...path, key],
        message: 'Unrecognized key',
        code: issue.code
      }));
    return [{ path, message: issue.message, code: issue.code }];
  });

/**
 * Returns a copy of the data where invalid `Date`s are replaced with
 * valid ones, so that encoding (which calls `toISOString`) can check
 * data that contains them. The old validator accepted invalid `Date`s.
 */
const replaceInvalidDates = (data: unknown): unknown => {
  if (data instanceof Date) return isNaN(data.getTime()) ? new Date(0) : data;
  if (Array.isArray(data)) return data.map(replaceInvalidDates);
  if (data !== null && typeof data === 'object')
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, replaceInvalidDates(v)])
    );
  return data;
};

/**
 * Creates the validator, which checks data against a Zod schema.
 */
const createValidator: NoDepFunctionService<Validator> = async () => {
  const validate: Validator['validate'] = async (
    schema,
    data,
    mode: ValidationMode = 'check',
    options = {}
  ) => {
    const result =
      mode === 'decode'
        ? z.safeDecode(schema, data)
        : z.safeEncode(
            schema,
            mode === 'check' ? replaceInvalidDates(data) : data
          );
    if (!result.success) {
      const issues = expandUnions(result.error.issues).filter(
        i => !(options.allowUnknownKeys && i.code === 'unrecognized_keys')
      );
      if (issues.length) throw new ValidationError(toValidationIssues(issues));
      return data;
    }
    return mode === 'check' ? data : result.data;
  };

  return { validate };
};

export default createValidator;
