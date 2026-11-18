import { z } from 'zod';
import { csRoleNames, dbRoleNames } from './group.ts';
import { pluginDoc } from './plugin.ts';
import { projectDoc } from './project.ts';
import { userForAdmin } from './user.ts';
import { userMyList } from './userMyList.ts';

/** The minimum information of the current user */
export const loginInfo = userForAdmin.pick({ userEmail: true, loginId: true });

/** The privileges of the current user, calculated from the groups */
export const userPrivileges = z.strictObject({
  domains: z.array(z.string()),
  globalPrivileges: z.array(z.string()),
  accessibleProjects: z.array(
    z.strictObject({
      projectId: z.string(),
      roles: z.array(z.enum(dbRoleNames)),
      project: projectDoc
    })
  ),
  accessiblePlugins: z.array(
    z.strictObject({
      pluginId: z.string(),
      roles: z.array(z.enum(csRoleNames)),
      plugin: pluginDoc
    })
  )
});

/** The full information of the current user */
export const loginInfoFull = userForAdmin
  .omit({ groups: true })
  .extend(userPrivileges.shape)
  .extend({
    groups: z.array(z.string()).describe('The names of the groups.'),
    defaultDomain: z.string().nullable(),
    myLists: z.array(userMyList).describe('The my lists of this user.'),
    sharedMyLists: z
      .array(z.strictObject({ owner: z.string(), sharedMyList: userMyList }))
      .describe('The my lists of other users this user can edit.'),
    dicomImageServer: z.string()
  });
