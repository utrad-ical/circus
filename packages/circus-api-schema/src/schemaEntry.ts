import { z } from 'zod';

export const schemaEntry = z.strictObject({
  key: z.string().describe('Property key.'),
  caption: z.string().optional(),
  type: z.enum(['text', 'number', 'boolean', 'select']),
  spec: z.record(z.string(), z.unknown()).optional()
});
