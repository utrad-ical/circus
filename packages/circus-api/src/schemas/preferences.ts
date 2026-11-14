import { z } from 'zod';
import { num } from './formats.ts';

export const preferences = z
  .strictObject({
    theme: z.enum(['mode_black', 'mode_white']).optional(),
    personalInfoView: z.boolean().optional(),
    seriesSearchPresets: z.array(z.record(z.string(), z.unknown())).optional(),
    caseSearchPresets: z.array(z.record(z.string(), z.unknown())).optional(),
    pluginJobSearchPresets: z
      .array(z.record(z.string(), z.unknown()))
      .optional(),
    referenceLine: z.boolean().optional(),
    initailAlphaForNewLabels: num({ min: 0, max: 1 }).optional(),
    windowPropagationScope: z.enum(['all', 'series', 'viewer']).optional(),
    interpolationMode: z.enum(['nearestNeighbor', 'trilinear']).optional(),
    scrollBars: z.enum(['none', 'small', 'large']).optional(), // Deprecated
    scrollBarsInfo: z
      .looseObject({
        size: z.enum(['small', 'large']).optional(),
        position: z.enum(['right', 'left', 'top', 'bottom']).optional(),
        visibility: z.enum(['none', 'always', 'hover']).optional()
      })
      .optional(),
    maintainAspectRatio: z.boolean().optional(),
    fixCenterOfGravity: z.boolean().optional(),
    dimmedOutlineFor2DLabels: z.enum(['hide', 'show', 'infinity']).optional(),
    revisionMessageTemplates: z.array(z.string()).optional(),
    labelColors: z
      .looseObject({
        useDefault: z.boolean().optional(),
        customColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/)).optional()
      })
      .optional()
  })
  .describe("The object that holds the user's preference.");
