import { z } from 'zod';

export const icon = z
  .strictObject({
    glyph: z.string(),
    color: z.string(),
    backgroundColor: z.string()
  })
  .describe('Represents an icon for projects and apps.');
