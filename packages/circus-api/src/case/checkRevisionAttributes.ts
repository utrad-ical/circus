import type { z } from 'zod';
import {
  validate,
  ValidationError,
  type ValidationIssue
} from '../createValidator.ts';
import type { jsonSchemaSubset } from '@utrad-ical/circus-api-schema';
import { attributesSchemaOf } from './attributesSchemaOf.ts';

type AttributesSchema = z.output<typeof jsonSchemaSubset>;

interface Project {
  caseAttributesSchema: AttributesSchema;
  labelAttributesSchema: AttributesSchema;
}

interface Revision {
  attributes: unknown;
  series: { labels: { attributes: unknown }[] }[];
}

/**
 * Checks the attributes of a revision and its labels with the schemas
 * of the project. Returns the issues, whose paths are in the revision.
 */
const checkRevisionAttributes = (
  project: Project,
  revision: Revision
): ValidationIssue[] => {
  const caseSchema = attributesSchemaOf(project.caseAttributesSchema);
  const labelSchema = attributesSchemaOf(project.labelAttributesSchema);
  const check = (
    schema: z.ZodType,
    value: unknown,
    path: (string | number)[]
  ) => {
    try {
      validate(schema, value, 'decode');
      return [];
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err;
      return err.issues.map(i => ({ ...i, path: [...path, ...i.path] }));
    }
  };
  return [
    ...check(caseSchema, revision.attributes, ['attributes']),
    ...revision.series.flatMap((series, s) =>
      series.labels.flatMap((label, l) =>
        check(labelSchema, label.attributes, [
          'series',
          s,
          'labels',
          l,
          'attributes'
        ])
      )
    )
  ];
};

export default checkRevisionAttributes;
