import { z } from 'zod';
import { num, sha1hex } from './formats.ts';

const numbers = () => z.array(num());

const point2 = () => z.tuple([num(), num()]);
const point3 = () => z.tuple([num(), num(), num()]);

// Fields shared by all label types
const common = {
  name: z.string().nullable().optional().describe('The name of this label.'),
  attributes: z.record(z.string(), z.unknown()).optional()
};

const commonData = {
  color: z
    .string()
    .regex(/^#[0-9a-f]{6,6}$/)
    .optional()
    .describe('The hexadecimal color value of this label.'),
  alpha: num({ min: 0, max: 1 })
    .optional()
    .describe('The alpha value of this label (1 is opaque).')
};

const variant = <T extends z.ZodType, D extends z.core.$ZodLooseShape>(
  type: T,
  data: D
) =>
  z.strictObject({
    ...common,
    type,
    data: z.looseObject({ ...commonData, ...data })
  });

export const label = z
  .discriminatedUnion('type', [
    variant(z.literal('voxel'), {
      voxels: sha1hex()
        .nullable()
        .describe('The hash of voxel data blob, which must be stored first.'),
      origin: z.tuple([z.int(), z.int(), z.int()]).optional(),
      size: z.tuple([z.int(), z.int(), z.int()]).optional()
    }),
    variant(z.enum(['cuboid', 'ellipsoid']), {
      min: numbers().length(3),
      max: numbers().length(3)
    }),
    variant(z.enum(['rectangle', 'ellipse']), {
      min: numbers().length(2),
      max: numbers().length(2),
      z: num()
    }),
    variant(z.literal('polyline'), {
      points: z.array(point2()).min(1),
      z: num()
    }),
    variant(z.literal('point'), {
      location: numbers().length(3)
    }),
    variant(z.literal('ruler'), {
      section: z.looseObject({
        origin: point3().optional(),
        xAxis: point3().optional(),
        yAxis: point3().optional()
      }),
      start: point3(),
      end: point3(),
      labelPosition: point2().optional()
    })
  ])
  .describe(
    'Information stored in `ClinicalCase.revisions[n].series[m].labels`.'
  );
