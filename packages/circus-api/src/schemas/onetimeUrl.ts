import { z } from 'zod';

export const onetimeUrl = z
  .strictObject({
    onetimeUrlId: z.string().optional(),
    userEmail: z.string().optional(),
    onetimeString: z.string().optional()
  })
  .describe(
    'One-time URL that enables a user to log in without a login ID and a password.'
  );
