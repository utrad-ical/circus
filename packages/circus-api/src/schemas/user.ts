import { z } from 'zod';
import { dateField, num } from './formats.ts';
import { preferences } from './preferences.ts';
import { userMyList } from './userMyList.ts';

export const user = z
  .strictObject({
    userEmail: z
      .email()
      .optional()
      .describe("User's e-mail address, which identifies the user globally."),
    loginId: z.string().optional(),
    password: z.string().optional().describe('The hashed password.'),
    lastLoginTime: dateField().optional(),
    lastLoginIp: z.string().optional(),
    preferences: preferences.optional(),
    loginEnabled: z.boolean().optional(),
    description: z.string().optional(),
    groups: z
      .array(num())
      .optional()
      .describe('The IDs of the groups this user belongs to.'),
    myLists: z.array(userMyList).optional()
  })
  .describe('Represents a user.');
