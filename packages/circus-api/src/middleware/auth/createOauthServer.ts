import KoaOAuth2Server from './KoaOAuth2Server';
import { determineUserAccessInfo } from '../../privilegeUtils';
import { Models, AuthProvider } from '../../interface';
import koa from 'koa';
import { FunctionService } from '@utrad-ical/circus-lib';

const debug = false;

export const OAuthClientId = 'CIRCUS Front UI';

interface Token {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

interface Options {
  fallbackToDefault?: boolean;
}

export const fetchUserFromToken = async (token: string, models: Models) => {
  const entry = await models.token.findById(token);
  if (!entry) return null;
  const user = await models.user.findByIdOrFail(entry.userId);
  const userPrivileges = await determineUserAccessInfo(models, user);
  return {
    accessToken: entry.accessToken,
    accessTokenExpiresAt: entry.accessTokenExpiresAt,
    client: { id: entry.clientId },
    user: { user, userPrivileges }
  };
};

/**
 * Creates an OAuth2 server that interacts with backend mongo.
 */
export const createOauthServer: FunctionService<
  KoaOAuth2Server,
  {
    models: Models;
    authProvider: AuthProvider;
    defaultAuthProvider: AuthProvider;
  },
  Options
> = async (opts, deps) => {
  const { models, authProvider, defaultAuthProvider } = deps;
  const { fallbackToDefault = false } = opts ?? {};
  const oauthModel = {
    getAccessToken: async function (bearerToken: string) {
      // debug && console.log('getAccessToken', arguments);
      return fetchUserFromToken(bearerToken, models);
    },
    getClient: async function (clientId: string /* clientSecret */) {
      // debug && console.log('getClient', arguments);
      if (clientId === 'circus-front') {
        return {
          clientId: OAuthClientId,
          grants: ['password', 'refresh_token']
        };
      }
      return null;
    },
    getRefreshToken: async function (refreshToken: string) {
      // debug && console.log('getRefreshToken', arguments);
      const result = await models.token.findAll({ refreshToken });
      if (!result.length) return null;
      const data = result[0];
      const user = await models.user.findById(data.userId);
      const retVal = {
        refreshToken: data.refreshToken,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        client: { clientId: data.clientId },
        user
      };
      return retVal;
    },
    revokeToken: async function (token: Token) {
      // debug && console.log('revokeToken', arguments);
      const result = await models.token.deleteOne({
        refreshToken: token.refreshToken
      });
      return result.deletedCount! > 0;
    },
    getUser: async (username: string, password: string) => {
      // debug && console.log('getting user', arguments);
      const ots = await models.onetimeUrl.findAll({ onetimeString: password });
      if (ots.length > 0) {
        if (username !== password) return null;
        await models.onetimeUrl.deleteOne({
          onetimeUrlId: ots[0].onetimeUrlId
        });
        return await models.user.findById(ots[0].userEmail);
      }
      const check = await authProvider.check(username, password);
      if (check.result === 'OK')
        return await models.user.findById(check.authenticatedUserEmail);
      if (fallbackToDefault) {
        const check = await defaultAuthProvider.check(username, password);
        if (check.result === 'OK')
          return await models.user.findById(check.authenticatedUserEmail);
      }
      return null;
    },
    saveToken: async function (token: Token, client: any, user: any) {
      // debug && console.log('saveToken', arguments);
      await models.token.insert({
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        clientId: client.clientId,
        userId: user.userEmail,
        permanentTokenId: null,
        permanentTokenDescription: null
      });
      return { ...token, client, user };
    }
  };

  async function onTokenIssue(ctx: koa.Context, token: any) {
    await models.user.modifyOne(token.user.userEmail, {
      lastLoginTime: new Date(),
      lastLoginIp: ctx.request.ip
    });
  }

  const oauth = new KoaOAuth2Server({
    model: oauthModel,
    grants: ['password', 'refresh_token'],
    // accessTokenLifetime: 3600,
    onTokenIssue,
    debug
  });
  return oauth;
};

createOauthServer.dependencies = [
  'models',
  'authProvider',
  'defaultAuthProvider'
];

export default createOauthServer;
