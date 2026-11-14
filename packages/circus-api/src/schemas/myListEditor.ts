import { z } from 'zod';
import { num } from './formats.ts';

export const myListEditor = z
  .discriminatedUnion('type', [
    z.strictObject({ type: z.literal('user'), userEmail: z.string() }),
    z.strictObject({ type: z.literal('group'), groupId: num() })
  ])
  .describe('Represents an editor of my list.');
