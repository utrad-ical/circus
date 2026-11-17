import { z } from 'zod';
import { dateField, dicomUid, multiIntegerRange, num } from './formats.ts';
import { patientInfo } from './patientInfo.ts';

/** A DICOM series in the database */
export const seriesDoc = z
  .strictObject({
    seriesUid: dicomUid().describe('The series instance UID.'),
    studyUid: dicomUid().describe('The study instance UID.'),
    width: num(),
    height: num(),
    images: multiIntegerRange().describe(
      'Instance numbers in `multi-integer-range` format.'
    ),
    seriesDate: dateField()
      .nullable()
      .describe('The "series date" written in the DICOM file.'),
    modality: z.string().max(10),
    seriesDescription: z.string(),
    bodyPart: z.string(),
    stationName: z.string(),
    modelName: z.string(),
    manufacturer: z.string(),
    storageId: num(),
    patientInfo,
    parameters: z
      .record(z.string(), z.unknown())
      .describe('Additional key-value pairs retrieved from the DICOM file.'),
    domain: z.string(),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a DICOM series.');

/** A series shown to a user, without the patient info unless allowed */
export const seriesForUser = seriesDoc.extend({
  patientInfo: patientInfo.optional()
});

const fileReason = z.strictObject({ file: z.string(), reason: z.string() });

/** The result of importing uploaded files */
export const seriesImportSummary = z.strictObject({
  imported: z.int(),
  skipped: z.array(fileReason),
  errors: z.array(fileReason)
});
