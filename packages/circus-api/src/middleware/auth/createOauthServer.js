import oauthserver from 'koa-oauth-server';

/**
 * Creates an OAuth2 server that interacts with backend mongo.
 */
export default function createOauthServer(models, debug = false) {

	const oauthModel = {
		getAccessToken: function *(bearerToken) {
			debug && console.log('getAccessToken', arguments);
			return yield models.token.findById(bearerToken);
		},
		getClient: function *(clientId, clientSecret) {
			console.log('getClient', arguments);
			if (clientId === 'circus-front') {
				return {
					clientId: 'CIRCUS Front UI',
					grants: ['password']
				};
			}
			return null;
		},
		getRefreshToken: function *(refreshToken) {
			debug && console.log('getRefreshToken', arguments);
			const result = yield models.token.findAll({ refreshToken });
			return result.length ? result[0] : null;
		},
		getUser: function *(username, password) {
			debug && console.log('getting user', arguments);
			const users = yield models.user.findAll({
				$or: [ { userEmail: username }, { loginId: username } ]
			});
			if (!users.length) return null;
			const user = users[0];
			if (user.password === password) return user; // TODO: FIX
		},
		saveToken: function *(token, client, user) {
			debug && console.log('saveToken', arguments);
			yield models.token.insertOne({
				accessToken: token.accessToken,
				accessTokenExpiresAt: token.accessTokenExpiresAt,
				refreshToken: token.refreshToken,
				refreshTokenExpiresAt: token.refreshTokenExpiresAt,
				client: client.id,
				userId: user.userEmail
			});
		}
	};

	const oauth = oauthserver({
		model: oauthModel,
		grants: ['password'],
		debug
	});
	return oauth;
}