import { z } from 'zod';
import { dateField } from './formats.ts';

/** A one-time URL in the database */
export const onetimeUrlDoc = z
  .strictObject({
    onetimeUrlId: z.string(),
    userEmail: z.string(),
    onetimeString: z.string(),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe(
    'One-time URL that enables a user to log in without a login ID and a password.'
  );
