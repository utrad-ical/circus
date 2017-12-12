import KoaOAuth2Server from './KoaOAuth2Server';
import nodepass from 'node-php-password';
import { determineUserAccessInfo } from '../../privilegeUtils';

const debug = false;

/**
 * Creates an OAuth2 server that interacts with backend mongo.
 */
export default function createOauthServer(models) {

	const oauthModel = {
		getAccessToken: async function(bearerToken) {
			debug && console.log('getAccessToken', arguments);
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
		getClient: async function(clientId, /* clientSecret */) {
			debug && console.log('getClient', arguments);
			if (clientId === 'circus-front') {
				return {
					clientId: 'CIRCUS Front UI',
					grants: ['password']
				};
			}
			return null;
		},
		getRefreshToken: async function(refreshToken) {
			debug && console.log('getRefreshToken', arguments);
			const result = await models.token.findAll({ refreshToken });
			return result.length ? result[0] : null;
		},
		getUser: async function(username, password) {
			debug && console.log('getting user', arguments);
			const users = await models.user.findAll({
				$or: [ { userEmail: username }, { loginId: username } ]
			});
			if (!users.length) return null;
			const user = users[0];
			if (nodepass.verify(password, user.password)) {
				return user;
			}
			return null;
		},
		saveToken: async function(token, client, user) {
			debug && console.log('saveToken', arguments);
			await models.token.insert({
				accessToken: token.accessToken,
				accessTokenExpiresAt: token.accessTokenExpiresAt,
				refreshToken: token.refreshToken,
				refreshTokenExpiresAt: token.refreshTokenExpiresAt,
				clientId: client.clientId,
				userId: user.userEmail
			});
			return { ...token, client, user };
		}
	};

	const oauth = new KoaOAuth2Server({
		model: oauthModel,
		grants: ['password'],
		debug
	});
	return oauth;
}