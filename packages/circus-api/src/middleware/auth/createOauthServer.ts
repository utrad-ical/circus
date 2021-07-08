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

interface Options {}

/**
 * Creates an OAuth2 server that interacts with backend mongo.
 */
export const createOauthServer: FunctionService<
  KoaOAuth2Server,
  { models: Models; authProvider: AuthProvider },
  Options
> = async (opt, deps) => {
  const { models, authProvider } = deps;
  const oauthModel = {
    getAccessToken: async function (bearerToken: string) {
      // debug && console.log('getAccessToken', arguments);
      const entry = await models.token.findById(bearerToken);
      if (!entry) return null;
      const user = await models.user.findByIdOrFail(entry.userId);
      const userPrivileges = await determineUserAccessInfo(models, user);
      return {
        accessToken: entry.accessToken,
        accessTokenExpiresAt: entry.accessTokenExpiresAt,
        client: { id: entry.clientId },
        user: { user, userPrivileges }
      };
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
      const check = await authProvider.check(username, password);
      if (check.result === 'NG') return null;
      return await models.user.findById(check.authenticatedUserEmail);
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

createOauthServer.dependencies = ['models', 'authProvider'];

export default createOauthServer;
