import { z } from 'zod';

export const serverParam = z.strictObject({
  key: z.string().optional(),
  value: z.unknown().optional() // Any JSON data
});
