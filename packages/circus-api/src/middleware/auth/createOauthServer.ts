import KoaOAuth2Server from './KoaOAuth2Server';
import nodepass from 'node-php-password';
import { determineUserAccessInfo } from '../../privilegeUtils';
import { Models } from '../../db/createModels';
import koa from 'koa';

const debug = false;

export const OAuthClientId = 'CIRCUS Front UI';

interface Token {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Creates an OAuth2 server that interacts with backend mongo.
 */
export default function createOauthServer(models: Models) {
  const oauthModel = {
    getAccessToken: async function(bearerToken: string) {
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
    getClient: async function(clientId: string /* clientSecret */) {
      // debug && console.log('getClient', arguments);
      if (clientId === 'circus-front') {
        return {
          clientId: OAuthClientId,
          grants: ['password', 'refresh_token']
        };
      }
      return null;
    },
    getRefreshToken: async function(refreshToken: string) {
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
    revokeToken: async function(token: Token) {
      // debug && console.log('revokeToken', arguments);
      const result = await models.token.deleteOne({
        refreshToken: token.refreshToken
      });
      return result.deletedCount! > 0;
    },
    getUser: async function(username: string, password: string) {
      // debug && console.log('getting user', arguments);
      const users = await models.user.findAll({
        $or: [{ userEmail: username }, { loginId: username }]
      });
      if (!users.length) return null;
      const user = users[0];
      if (nodepass.verify(password, user.password)) {
        return user;
      }
      return null;
    },
    saveToken: async function(token: Token, client: any, user: any) {
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
}
