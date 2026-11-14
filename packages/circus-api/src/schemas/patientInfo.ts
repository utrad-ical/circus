import { z } from 'zod';
import { num } from './formats.ts';

export const patientInfo = z
  .strictObject({
    patientId: z.string().optional(),
    patientName: z.string().optional(),
    age: num().optional(),
    birthDate: z
      .string()
      .regex(/^\d\d\d\d-\d\d-\d\d$/)
      .optional(),
    sex: z.enum(['F', 'M', 'O']).optional(),
    size: num().optional(),
    weight: num().optional()
  })
  .describe(
    'Personal information that was written in corresponding DICOM files.'
  );
