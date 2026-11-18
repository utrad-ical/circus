import type { Models } from '../../interface.ts';
import { determineUserAccessInfo } from '../../privilegeUtils.ts';

const invalidToken = {
  ok: false,
  error: 'Invalid token: access token is invalid'
} as const;

export const resolveAccessToken = async (
  models: Models,
  accessToken: string
) => {
  const token = await models.token.findById(accessToken);
  const expiresAt = token?.accessTokenExpiresAt;
  if (
    !token ||
    !(expiresAt instanceof Date) ||
    !Number.isFinite(expiresAt.getTime())
  ) {
    return invalidToken;
  }
  if (expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      error: 'Invalid token: access token has expired'
    } as const;
  }
  const user = await models.user.findById(token.userId);
  if (!user) return invalidToken;
  const userPrivileges = await determineUserAccessInfo(models, user);
  return { ok: true as const, token, user, userPrivileges };
};
