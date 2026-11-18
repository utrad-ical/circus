import { randomBytes } from 'node:crypto';
import { getCookie, setCookie } from 'hono/cookie';
import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';
import type { Models } from '../../interface.ts';
import type { CircusContext } from '../../typings/middlewares.ts';
import { httpError } from '../errorHandler.ts';
import { resolveAccessToken } from './resolveAccessToken.ts';

export const sessionCookieName = 'circus-session';
export const sessionClientId = 'CIRCUS Browser Session';

const sessionLifetimeMs = 14 * 24 * 60 * 60 * 1000;
const extensionIntervalMs = 60 * 60 * 1000;
export const csrfHeaderName = 'X-Requested-With';
export const expectedUserHeaderName = 'X-Circus-User';
export const sessionUserChangedHeaderName = 'X-Circus-Session-User-Changed';

const firstForwarded = (value?: string | string[]) =>
  (Array.isArray(value) ? value[0] : value)?.split(',', 1)[0].trim();

const cookieOptions = (request: IncomingMessage) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure:
    (request.socket as TLSSocket).encrypted === true ||
    firstForwarded(request.headers['x-forwarded-proto']) === 'https',
  path: '/'
});

/** Cookie-authenticated requests that change data require a CSRF header. */
export const checkCsrfHeader = (
  method: string,
  header: string | undefined,
  alsoForSafeMethods = false
) => {
  const safe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if ((!safe || alsoForSafeMethods) && !header) {
    throw httpError(403, `The ${csrfHeaderName} header is required.`);
  }
};

export const startSession = async (
  ctx: CircusContext,
  models: Models,
  userEmail: string
) => {
  await revokeSession(ctx, models);
  const now = Date.now();
  const accessToken = randomBytes(20).toString('hex');
  await models.token.insert({
    accessToken,
    accessTokenExpiresAt: new Date(now + sessionLifetimeMs),
    refreshToken: randomBytes(20).toString('hex'),
    refreshTokenExpiresAt: new Date(now),
    clientId: sessionClientId,
    userId: userEmail,
    permanentTokenId: null,
    permanentTokenDescription: null
  });
  const request = ctx.env.incoming;
  await models.user.modifyOne(userEmail, {
    lastLoginTime: new Date(now),
    lastLoginIp:
      firstForwarded(request.headers['x-forwarded-for']) ??
      request.socket.remoteAddress ??
      ''
  });
  setCookie(ctx, sessionCookieName, accessToken, cookieOptions(request));
};

const revokeSession = async (ctx: CircusContext, models: Models) => {
  const accessToken = getCookie(ctx, sessionCookieName);
  if (accessToken) {
    await models.token.deleteOne({ accessToken, clientId: sessionClientId });
  }
};

export const endSession = async (ctx: CircusContext, models: Models) => {
  await revokeSession(ctx, models);
  setCookie(ctx, sessionCookieName, '', {
    ...cookieOptions(ctx.env.incoming),
    expires: new Date(0)
  });
};

interface Credentials {
  method: string;
  authorization?: string;
  cookie?: string;
  csrf?: string;
  expectedUser?: string;
  misplacedToken?: unknown;
}

export const authenticateRequest = async (
  models: Models,
  {
    method,
    authorization,
    cookie,
    csrf,
    expectedUser,
    misplacedToken
  }: Credentials
) => {
  const byCookie = !authorization && !!cookie;
  if (byCookie) checkCsrfHeader(method, csrf);
  if (misplacedToken) {
    throw httpError(
      400,
      'Invalid request: send the access token in the Authorization header'
    );
  }
  const bearer = /^Bearer[ \t]+([^\s,]+)$/i.exec(authorization ?? '')?.[1];
  if (authorization && !bearer) {
    throw httpError(400, 'Invalid request: malformed authorization header');
  }
  const accessToken = bearer ?? cookie;
  if (!accessToken)
    throw httpError(401, 'Unauthorized request: no authentication given');
  const result = await resolveAccessToken(models, accessToken);
  if (!result.ok) throw httpError(401, result.error);

  if (byCookie) {
    if (expectedUser && expectedUser !== result.user.userEmail) {
      throw httpError(409, 'The user of this session has changed.', {
        [sessionUserChangedHeaderName]: '1'
      });
    }
    const { token } = result;
    const now = Date.now();
    if (
      token.clientId === sessionClientId &&
      token.accessTokenExpiresAt.getTime() - now <=
        sessionLifetimeMs - extensionIntervalMs
    ) {
      await models.token.modifyOne(token.accessToken, {
        accessTokenExpiresAt: new Date(now + sessionLifetimeMs)
      });
    }
  }
  return { user: result.user, userPrivileges: result.userPrivileges, byCookie };
};

/** Reads the session cookie from a Node HTTP request or WebSocket upgrade. */
export const sessionFromRawRequest = (cookieHeader?: string) => {
  for (const pair of (cookieHeader ?? '').split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name === sessionCookieName) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return undefined;
      }
    }
  }
};
