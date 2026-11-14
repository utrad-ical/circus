import { z } from 'zod';

const vector3 = () => z.tuple([z.number(), z.number(), z.number()]);

/**
 * The shape of the results.json file recognized by CIRCUS CS apps.
 * Unknown properties are allowed.
 */
export const resultsSchema = z.looseObject({
  results: z
    .looseObject({
      lesionCandidates: z
        .array(
          z.looseObject({
            confidence: z.custom(v => v !== undefined, 'Required'),
            volumeId: z.int().min(0),
            location: vector3(),
            rank: z
              .int()
              .min(1)
              .optional()
              .describe('Rank of this lesion candidate, starting from 1.'),
            volumeSize: z.number().optional()
          })
        )
        .optional()
    })
    .optional()
    .describe('Holds the main calculated output of the app.'),
  metadata: z
    .looseObject({
      displayOptions: z
        .array(
          z.looseObject({
            volumeId: z.number().min(0),
            crop: z
              .looseObject({ origin: vector3(), size: vector3() })
              .optional(),
            window: z
              .looseObject({ level: z.number(), width: z.number() })
              .optional()
          })
        )
        .optional()
    })
    .optional()
    .describe('Holds the metadata of the app.')
});
