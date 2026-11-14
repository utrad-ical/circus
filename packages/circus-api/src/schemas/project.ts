import { z } from 'zod';
import { color, kebab, num } from './formats.ts';
import { jsonSchemaSubset } from './jsonSchemaSubset.ts';

export const project = z.strictObject({
  projectId: z
    .string()
    .max(64)
    .optional()
    .describe('Randomly-generated project ID. It must be globally unique.'),
  projectName: z
    .string()
    .max(64)
    .optional()
    .describe('Short name for this project.'),
  icon: z
    .looseObject({
      glyph: kebab(),
      color: color(),
      backgroundColor: color()
    })
    .optional(),
  description: z.string().max(1024).optional(),
  tags: z
    .array(
      z.looseObject({
        caption: z.string().optional(),
        color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/)
          .optional()
      })
    )
    .optional()
    .describe('List of tags available in this project.'),
  caseAttributesSchema: jsonSchemaSubset
    .optional()
    .describe('The schema of case attributes (a subset of JSON Schema).'),
  labelAttributesSchema: jsonSchemaSubset
    .optional()
    .describe('The schema of label attributes (a subset of JSON Schema).'),
  windowPresets: z
    .array(z.looseObject({ label: z.string(), level: num(), width: num() }))
    .optional(),
  windowPriority: z
    .enum([
      'dicom,preset,auto',
      'dicom,auto',
      'preset,dicom,auto',
      'preset,auto',
      'auto'
    ])
    .optional()
});
