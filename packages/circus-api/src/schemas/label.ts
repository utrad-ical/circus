import { z } from 'zod';
import { color, num, sha1hex } from './formats.ts';

const numbers = () => z.array(num());

const point2 = () => z.tuple([num(), num()]);
const point3 = () => z.tuple([num(), num(), num()]);
const int3 = () => z.tuple([z.int(), z.int(), z.int()]);

// The appearance shared by all label types
const appearance = {
  color: color().describe('The hexadecimal color value of this label.'),
  alpha: num({ min: 0, max: 1 }).describe(
    'The alpha value of this label (1 is opaque).'
  )
};

const dataOf = <S extends z.core.$ZodLooseShape>(shape: S) =>
  z.strictObject({ ...appearance, ...shape });

const name = z.string().nullable().describe('The name of this label.');
const attributes = z
  .record(z.string(), z.unknown())
  .describe('Label attributes defined by the project.');

/**
 * A new label may lack the name and the attributes,
 * because a label of an old revision is saved again as is.
 */
const variantsOf = (forCreate: boolean) => {
  const variant = <T extends z.ZodType, D extends z.ZodType>(
    type: T,
    data: D
  ) =>
    z.strictObject({
      type,
      name: forCreate ? name.default(null) : name,
      attributes: forCreate ? attributes.default({}) : attributes,
      data
    });
  return [
    variant(
      z.literal('voxel'),
      z.union([
        dataOf({ voxels: z.null().describe('An empty label.') }),
        dataOf({
          voxels: sha1hex().describe(
            'The hash of voxel data blob, which must be stored first.'
          ),
          origin: int3(),
          size: int3()
        })
      ])
    ),
    variant(
      z.enum(['cuboid', 'ellipsoid']),
      dataOf({ min: numbers().length(3), max: numbers().length(3) })
    ),
    variant(
      z.enum(['rectangle', 'ellipse']),
      dataOf({
        min: numbers().length(2),
        max: numbers().length(2),
        z: num()
      })
    ),
    variant(
      z.literal('polyline'),
      dataOf({ points: z.array(point2()).min(1), z: num() })
    ),
    variant(z.literal('point'), dataOf({ location: numbers().length(3) })),
    variant(
      z.literal('ruler'),
      dataOf({
        section: z.strictObject({
          origin: point3(),
          xAxis: point3(),
          yAxis: point3()
        }),
        start: point3(),
        end: point3(),
        labelPosition: point2().optional()
      })
    )
  ] as const;
};

/** A label stored in a revision of a case */
export const label = z
  .discriminatedUnion('type', variantsOf(false))
  .describe(
    'Information stored in `ClinicalCase.revisions[n].series[m].labels`.'
  );

/** A label in a new revision */
export const labelCreate = z.discriminatedUnion('type', variantsOf(true));
