import { z } from 'zod';

const isRegExp = (pattern: string) => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

const count = () => z.int().nonnegative().optional();

/**
 * The schema of one attribute, which the web UI (`JsonSchemaEditor`) edits.
 * With `enum`, the value is one of the options (`type` may be omitted).
 */
export const attributeSchema = z.strictObject({
  type: z.enum(['number', 'integer', 'string', 'boolean']).optional(),
  enum: z.array(z.union([z.string(), z.number()])).optional(),
  // For strings
  pattern: z.string().refine(isRegExp, 'Invalid regular expression').optional(),
  minLength: count(),
  maxLength: count(),
  // For numbers
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  exclusiveMinimum: z.number().optional(),
  exclusiveMaximum: z.number().optional()
});

/**
 * The subset of JSON Schema that defines the attributes of cases and labels
 * of a project (`caseAttributesSchema` and `labelAttributesSchema`).
 */
export const jsonSchemaSubset = z.strictObject({
  type: z.literal('object').optional(),
  properties: z.record(z.string(), attributeSchema).optional(),
  required: z.array(z.string()).optional()
});

/** Builds the schema of a value from the keywords other than `enum` */
const typedSchemaOf = (attr: z.output<typeof attributeSchema>): z.ZodType => {
  switch (attr.type) {
    case 'string': {
      let s = z.string();
      if (attr.minLength !== undefined) s = s.min(attr.minLength);
      if (attr.maxLength !== undefined) s = s.max(attr.maxLength);
      if (attr.pattern !== undefined) s = s.regex(new RegExp(attr.pattern));
      return s;
    }
    case 'number':
    case 'integer': {
      let n = attr.type === 'integer' ? z.int() : z.number();
      if (attr.minimum !== undefined) n = n.gte(attr.minimum);
      if (attr.maximum !== undefined) n = n.lte(attr.maximum);
      if (attr.exclusiveMinimum !== undefined) n = n.gt(attr.exclusiveMinimum);
      if (attr.exclusiveMaximum !== undefined) n = n.lt(attr.exclusiveMaximum);
      return n;
    }
    case 'boolean':
      return z.boolean();
    default:
      return z.unknown();
  }
};

// All the keywords apply together, as in JSON Schema
const valueSchemaOf = (attr: z.output<typeof attributeSchema>): z.ZodType => {
  const typed = typedSchemaOf(attr);
  const options = attr.enum;
  if (!options) return typed;
  return typed.refine(
    v => options.includes(v as string | number),
    `Expected one of: ${options.join(', ')}`
  );
};

/** Any value, but it must exist */
const present = () => z.custom(v => v !== undefined, { message: 'Required' });

/**
 * Builds the Zod schema to check attribute values with the schema
 * defined in a project. Unknown attributes are allowed, as in JSON Schema
 * (e.g., the values of attributes removed from the schema).
 */
export const attributesSchemaOf = (
  schema: z.output<typeof jsonSchemaSubset>
) => {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  return z.looseObject({
    // A required attribute may not be defined in `properties`
    ...Object.fromEntries(required.map(key => [key, present()])),
    ...Object.fromEntries(
      Object.entries(properties).map(([key, attr]) => {
        const value = valueSchemaOf(attr);
        // `present()` also rejects a missing value of an untyped attribute
        return [
          key,
          required.includes(key) ? present().pipe(value) : value.optional()
        ];
      })
    )
  });
};
