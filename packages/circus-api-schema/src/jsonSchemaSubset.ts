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
