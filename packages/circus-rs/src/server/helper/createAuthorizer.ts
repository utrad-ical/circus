import { Authorizer } from './prepareHelperModules';
import AuthorizationCache from './auth/AuthorizationCache';
import { generateAccessToken } from './auth/generateAccessToken';

export default function createAuthorizer(config: any): Authorizer {
  const authorizationCache = new AuthorizationCache(config);
  return {
    issueToken: async seriesUID => {
      const token = await generateAccessToken();
      authorizationCache.update(seriesUID, token);
      return token;
    },
    checkToken: async (token, seriesUID) =>
      !!(seriesUID && authorizationCache.isValid(seriesUID, token)),
    dispose: async () => await authorizationCache.dispose()
  };
}
