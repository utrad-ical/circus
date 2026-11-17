import { z } from 'zod';
import { color, dateField, kebab, num } from './formats.ts';
import { jsonSchemaSubset } from './jsonSchemaSubset.ts';

/** A project in the database */
export const projectDoc = z
  .strictObject({
    projectId: z
      .string()
      .max(64)
      .describe('Randomly-generated project ID. It must be globally unique.'),
    projectName: z.string().max(64).describe('Short name for this project.'),
    icon: z.looseObject({
      glyph: kebab(),
      color: color(),
      backgroundColor: color()
    }),
    description: z.string().max(1024),
    tags: z
      .array(
        z.looseObject({
          caption: z.string().optional(),
          color: color().optional()
        })
      )
      .describe('List of tags available in this project.'),
    caseAttributesSchema: jsonSchemaSubset.describe(
      'The schema of case attributes (a subset of JSON Schema).'
    ),
    labelAttributesSchema: jsonSchemaSubset.describe(
      'The schema of label attributes (a subset of JSON Schema).'
    ),
    windowPresets: z.array(
      z.looseObject({ label: z.string(), level: num(), width: num() })
    ),
    windowPriority: z.enum([
      'dicom,preset,auto',
      'dicom,auto',
      'preset,dicom,auto',
      'preset,auto',
      'auto'
    ]),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a project.');

export const projectCreate = projectDoc.omit({
  projectId: true,
  createdAt: true,
  updatedAt: true
});

export const projectPatch = projectCreate.partial();
