import { z } from 'zod';
import { dateField, dicomUid, multiIntegerRange, num } from './formats.ts';
import { patientInfo } from './patientInfo.ts';

export const series = z
  .strictObject({
    seriesUid: dicomUid().optional().describe('The series instance UID.'),
    studyUid: dicomUid().optional().describe('The study instance UID.'),
    width: num().optional(),
    height: num().optional(),
    images: multiIntegerRange()
      .optional()
      .describe('Instance numbers in `multi-integer-range` format.'),
    seriesDate: dateField()
      .nullable()
      .optional()
      .describe('The "series date" written in the DICOM file.'),
    modality: z.string().max(10).optional(),
    seriesDescription: z.string().optional(),
    bodyPart: z.string().optional(),
    stationName: z.string().optional(),
    modelName: z.string().optional(),
    manufacturer: z.string().optional(),
    storageId: num().optional(),
    patientInfo: patientInfo.optional(),
    parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Additional key-value pairs retrieved from the DICOM file.'),
    domain: z.string().optional()
  })
  .describe('Represents a DICOM series.');
