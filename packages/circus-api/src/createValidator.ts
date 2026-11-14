import type { NoDepFunctionService } from '@utrad-ical/circus-lib';
import { z } from 'zod';
import type { ValidationMode, Validator } from './interface.ts';
import { dateField } from './schemas/formats.ts';
import defaultSchemas from './schemas/index.ts';

export interface ValidationErrorItem {
  /** JSON Pointer to the invalid value, e.g., '/domains/0' */
  instancePath: string;
  message: string;
  code: string;
}

/**
 * Thrown when the data does not match the schema.
 */
export class ValidationError extends Error {
  errors: ValidationErrorItem[];
  /** Set by validateInOut */
  phase?: 'request' | 'response';

  constructor(errors: ValidationErrorItem[]) {
    super(
      'Validation failed: ' +
        errors.map(e => `${e.instancePath || '/'} ${e.message}`).join(', ')
    );
    this.name = 'ValidationError';
    this.errors = errors;
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

const escapePointer = (segment: PropertyKey) =>
  String(segment).replace(/~/g, '~0').replace(/\//g, '~1');

const toErrorItems = (issues: Issue[]): ValidationErrorItem[] =>
  issues.map(issue => ({
    instancePath: issue.path.map(p => '/' + escapePointer(p)).join(''),
    message: issue.message,
    code: issue.code
  }));

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

const asObject = (schema: z.ZodType): z.ZodObject => {
  if (!(schema instanceof z.ZodObject))
    throw new TypeError('Unsupported schema: an object schema is required');
  return schema;
};

const toList = (str = '') =>
  str
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length);

/** Builds a mask for pick/omit/partial/required from existing keys */
const maskOf = (schema: z.ZodObject, keys: string[]): any =>
  Object.fromEntries(keys.filter(k => k in schema.shape).map(k => [k, true]));

const withDates = (schema: z.ZodType) =>
  asObject(schema).extend({ createdAt: dateField(), updatedAt: dateField() });

const searchResultOf = (items: z.ZodType) =>
  z.looseObject({
    items: z.array(items),
    totalItems: z.number(),
    page: z.number()
  });

type Filter = (
  schema: z.ZodType,
  args: string[],
  named: (name: string) => z.ZodType
) => z.ZodType;

// Filters used in schema definition strings like 'user|exclude password'
const filters: { [name: string]: Filter } = {
  allRequired: schema => asObject(schema).required(),
  allRequiredExcept: (schema, [except]) => {
    const obj = asObject(schema);
    const excepts = toList(except);
    const others = Object.keys(obj.shape).filter(k => !excepts.includes(k));
    return obj.partial(maskOf(obj, excepts)).required(maskOf(obj, others));
  },
  only: (schema, [props]) => {
    const obj = asObject(schema);
    return z.strictObject(obj.pick(maskOf(obj, toList(props))).shape);
  },
  exclude: (schema, [props]) => {
    const obj = asObject(schema);
    return obj.omit(maskOf(obj, toList(props)));
  },
  // Without a schema name, the property can hold anything
  addProperty: (schema, [name, ref], named) =>
    asObject(schema).extend({
      [name]: (ref ? named(ref) : z.unknown()).optional()
    }),
  searchResult: schema => searchResultOf(withDates(schema)),
  dbEntry: schema => withDates(asObject(schema).required())
};

/**
 * Creates the validator that knows all the schemas under `schemas/`.
 * A schema is specified by its name, optionally followed by filters
 * (e.g., 'user|exclude password|dbEntry'). Alternatives are separated by '/'.
 */
const createValidator: NoDepFunctionService<
  Validator,
  { schemas?: Record<string, z.ZodType> } | undefined
> = async opts => {
  const schemas = opts?.schemas ?? defaultSchemas;
  const cache = new Map<string, z.ZodType>();

  const named = (name: string) => {
    const schema = schemas[name];
    if (!schema) throw new TypeError(`Unregistered schema name: ${name}`);
    return schema;
  };

  const build = (def: string): z.ZodType => {
    const parts = def.split('/').map(part => {
      const [name, ...filterDefs] = part.trim().split(/\s*\|\s*/);
      let schema = named(name);
      let searchResultItem: z.ZodType | undefined;
      for (const filterDef of filterDefs) {
        const [filterName, ...args] = filterDef.trim().split(/\s+/);
        const filter = filters[filterName];
        if (!filter) throw new TypeError(`Unknown filter: ${filterName}`);
        if (filterName === 'searchResult') searchResultItem = withDates(schema);
        schema = filter(schema, args, named);
      }
      return { schema, searchResultItem };
    });
    if (parts.length === 1) return parts[0].schema;
    // 'a|searchResult/b|searchResult' accepts a list mixing a and b
    if (parts.every(p => p.searchResultItem))
      return searchResultOf(
        z.union(parts.map(p => p.searchResultItem!) as [z.ZodType])
      );
    return z.union(parts.map(p => p.schema) as [z.ZodType]);
  };

  const getSchema = (def: string | z.ZodType) => {
    if (typeof def !== 'string') return def;
    let schema = cache.get(def);
    if (!schema) {
      schema = build(def);
      cache.set(def, schema);
    }
    return schema;
  };

  const validate: Validator['validate'] = async (
    def,
    data,
    mode: ValidationMode = 'default',
    options = {}
  ) => {
    const schema = getSchema(def);
    // Parsing converts ISO strings into Dates;
    // encoding checks Dates and converts them into ISO strings
    const result =
      mode === 'toDate'
        ? z.safeDecode(schema, data)
        : z.safeEncode(
            schema,
            mode === 'default' ? replaceInvalidDates(data) : data
          );
    if (!result.success) {
      const issues = expandUnions(result.error.issues).filter(
        i => !(options.allowUnknownKeys && i.code === 'unrecognized_keys')
      );
      if (issues.length) throw new ValidationError(toErrorItems(issues));
      return data;
    }
    return mode === 'default' ? data : result.data;
  };

  return { validate };
};

export default createValidator;
