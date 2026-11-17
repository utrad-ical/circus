import { z } from 'zod';
import { num } from './formats.ts';

export const jsonSchemaSubset = z.strictObject({
  type: z.literal('object').optional(),
  properties: z
    .record(
      z.string(),
      z.looseObject({
        type: z.enum(['number', 'integer', 'string', 'boolean']).optional(),
        maximum: num().optional(),
        minimum: num().optional(),
        exclusiveMaximum: num().optional(),
        exclusiveMinimum: num().optional(),
        minLength: z.int().optional(),
        maxLength: z.int().optional(),
        enum: z.array(z.string()).optional()
      })
    )
    .optional(),
  required: z.array(z.string()).optional()
});
