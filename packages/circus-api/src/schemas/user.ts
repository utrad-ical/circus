import { z } from 'zod';
import { dateField } from './formats.ts';
import { preferences } from './preferences.ts';
import { userMyList } from './userMyList.ts';

/** A user in the database */
export const userDoc = z
  .strictObject({
    userEmail: z
      .email()
      .describe("User's e-mail address, which identifies the user globally."),
    loginId: z.string(),
    password: z.string().describe('The hashed password.'),
    lastLoginTime: dateField(),
    lastLoginIp: z.string(),
    preferences,
    loginEnabled: z.boolean(),
    description: z.string(),
    groups: z
      .array(z.int())
      .describe('The IDs of the groups this user belongs to.'),
    myLists: z.array(userMyList),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a user.');

/** A user shown to the administrators */
export const userForAdmin = userDoc.omit({ password: true });

/** A user shown to everyone */
export const userPublic = userDoc.pick({
  userEmail: true,
  loginId: true,
  description: true,
  createdAt: true,
  updatedAt: true
});

/** Creates a user. The password is in plain text. */
export const userCreate = userDoc
  .pick({
    userEmail: true,
    loginId: true,
    loginEnabled: true,
    description: true,
    groups: true
  })
  .extend({
    password: z.string().describe('The password in plain text.'),
    preferences: preferences.optional()
  });

/** Updates a user. The password is in plain text. */
export const userPatch = userCreate.omit({ userEmail: true }).partial();
