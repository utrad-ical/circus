import { determineUserAccessInfo } from '../../privilegeUtils.ts';
import type { Models } from '../../interface.ts';

export const getFixedUser = async (models: Models, userEmail: string) => {
  const user = await models.user.findByIdOrFail(userEmail);
  const userPrivileges = await determineUserAccessInfo(models, user);
  return { user, userPrivileges, byCookie: false };
};
