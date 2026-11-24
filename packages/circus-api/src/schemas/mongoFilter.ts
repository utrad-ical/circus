import { BSONRegExp } from 'mongodb';
import { z } from 'zod';

/** Removes optional, nullable, etc. to get the schema of the value itself */
const unwrap = (schema: z.ZodType): z.ZodType =>
  schema instanceof z.ZodOptional ||
  schema instanceof z.ZodNullable ||
  schema instanceof z.ZodDefault
    ? unwrap(schema.unwrap() as z.ZodType)
    : schema;

/**
 * Picks the schemas of the given (possibly dotted) properties
 * of an object schema, e.g., `['modality', 'patientInfo.age']`.
 */
export const fieldsOf = (schema: z.ZodObject, paths: string[]) =>
  Object.fromEntries(
    paths.map(path => {
      let current: z.ZodType = schema;
      for (const key of path.split('.')) {
        const obj = unwrap(current);
        if (!(obj instanceof z.ZodObject) || !(key in obj.shape))
          throw new TypeError(`No such property: ${path}`);
        current = obj.shape[key] as z.ZodType;
      }
      return [path, current];
    })
  );

/**
 * The schema of a value to compare with a property.
 * An array property matches its element. A string property takes any string
 * (a value of a wrong format, such as a partial UID, just matches nothing)
 * or a regular expression (`{ "$regex": "…" }` in EJSON).
 */
const valueOf = (schema: z.ZodType): z.ZodType => {
  const value = unwrap(schema);
  if (value instanceof z.ZodArray) return valueOf(value.element as z.ZodType);
  if (value instanceof z.ZodString)
    return z.union([z.string(), z.instanceof(BSONRegExp)]);
  if (value instanceof z.ZodEnum)
    return z.union([value, z.instanceof(BSONRegExp)]);
  return value;
};

const condition = (schema: z.ZodType) => {
  const value = valueOf(schema);
  return z.union([
    value,
    z
      .strictObject({
        $gt: value,
        $gte: value,
        $lt: value,
        $lte: value,
        $ne: value,
        $in: z.array(value),
        $all: z.array(value)
      })
      .partial()
      // A RegExp or a Date would otherwise pass as an object without keys
      .refine(
        ops =>
          Object.getPrototypeOf(ops) === Object.prototype &&
          Object.keys(ops).length > 0,
        'Expected a value or operators'
      )
  ]);
};

/**
 * Builds the schema of a search filter, which is a subset of MongoDB queries
 * parsed from EJSON. It accepts only the given properties,
 * the comparison operators, `$in`, `$all`, `$and` and `$or`.
 * @param fields The schemas of the searchable properties.
 */
export const mongoFilter = (fields: Record<string, z.ZodType>) => {
  const conditions = Object.fromEntries(
    Object.entries(fields).map(([key, schema]) => [
      key,
      condition(schema).optional()
    ])
  );
  const filter: z.ZodType = z.lazy(() =>
    z.strictObject({
      ...conditions,
      $and: z.array(filter).optional(),
      $or: z.array(filter).optional()
    })
  );
  return filter;
};
