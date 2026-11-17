import { z } from 'zod';
import { dateField } from './formats.ts';

/** A server parameter in the database */
export const serverParamDoc = z.strictObject({
  key: z.string(),
  value: z.unknown().describe('Any JSON data.'),
  createdAt: dateField(),
  updatedAt: dateField()
});
