import { z } from 'zod';
import {
  dateField,
  dicomUid,
  multiIntegerRange
} from '../src/schemas/formats.ts';

/**
 * Schemas used only in tests.
 */
const testSchemas = {
  sample: z.strictObject({
    intVal: z.number().optional(),
    strVal: z.string().optional(),
    dicomUid: dicomUid().optional(),
    multiRange: multiIntegerRange().optional()
  }),
  date: z.strictObject({
    intVal: z.number().optional(),
    dateVal: dateField().optional()
  }),
  item: z.strictObject({
    itemId: z.number().optional(),
    name: z.string().optional(),
    color: z.string().optional(),
    stock: z.boolean().optional(),
    price: z.number().optional()
  }),
  months: z.strictObject({
    month: z.number().optional(),
    name: z.string().optional()
  }),
  bankAccounts: z.strictObject({
    userId: z.number().optional(),
    name: z.string().optional(),
    balance: z.number().optional()
  })
};

export default testSchemas;
