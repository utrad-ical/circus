import { randomBytes } from 'node:crypto';
import type koa from 'koa';
import type { Models } from '../../interface.ts';
import { resolveAccessToken } from './resolveAccessToken.ts';

type Ctx = koa.ParameterizedContext<any, any>;

/**
 * Browser sessions.
 *
 * The browser sends its access token in an HttpOnly session cookie.
 */

export const sessionCookieName = 'circus-session';

/** The `clientId` of tokens issued as browser sessions */
export const sessionClientId = 'CIRCUS Browser Session';

/** A session expires after this period of inactivity */
const sessionLifetimeMs = 14 * 24 * 60 * 60 * 1000;

/** The expiration is extended at most once in this period */
const extensionIntervalMs = 60 * 60 * 1000;

/**
 * The header required for cookie-authenticated requests that may change data.
 * Browsers cannot send custom headers to another origin without CORS,
 * so this protects against CSRF together with `SameSite=Lax`.
 */
export const csrfHeaderName = 'X-Requested-With';

const isSafeMethod = (method: string) =>
  method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

const cookieOptions = (ctx: Ctx) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  // HTTPS is not available in some installations; `ctx.secure` respects
  // X-Forwarded-Proto set by the reverse proxy (`app.proxy` is enabled)
  secure: ctx.secure,
  path: '/',
  overwrite: true
});

/**
 * Throws if a request that may change data lacks the CSRF header.
 */
export const checkCsrfHeader = (ctx: Ctx, alsoForSafeMethods = false) => {
  if (
    (alsoForSafeMethods || !isSafeMethod(ctx.method)) &&
    !ctx.get(csrfHeaderName)
  ) {
    ctx.throw(403, `The ${csrfHeaderName} header is required.`);
  }
};

/**
 * Creates a new session for the user and sets the session cookie.
 */
export const startSession = async (
  ctx: Ctx,
  models: Models,
  userEmail: string
) => {
  const now = Date.now();
  const accessToken = randomBytes(20).toString('hex');
  await models.token.insert({
    accessToken,
    accessTokenExpiresAt: new Date(now + sessionLifetimeMs),
    // Sessions are not refreshed with a refresh token
    refreshToken: randomBytes(20).toString('hex'),
    refreshTokenExpiresAt: new Date(now),
    clientId: sessionClientId,
    userId: userEmail,
    permanentTokenId: null,
    permanentTokenDescription: null
  });
  await models.user.modifyOne(userEmail, {
    lastLoginTime: new Date(now),
    lastLoginIp: ctx.request.ip
  });
  ctx.cookies.set(sessionCookieName, accessToken, cookieOptions(ctx));
};

/**
 * Deletes the session of the current request (if any) and clears the cookie.
 */
export const endSession = async (ctx: Ctx, models: Models) => {
  const accessToken = ctx.cookies.get(sessionCookieName);
  if (accessToken) {
    await models.token.deleteOne({ accessToken, clientId: sessionClientId });
  }
  ctx.cookies.set(sessionCookieName, null, cookieOptions(ctx));
};

/** Authenticates API clients with a Bearer token and the web UI with its session cookie. */
export const authenticateRequest = (models: Models): koa.Middleware => {
  return async (ctx, next) => {
    const authorization = ctx.get('Authorization');
    const cookie = ctx.cookies.get(sessionCookieName);
    const byCookie = !authorization && !!cookie;
    if (byCookie) checkCsrfHeader(ctx);

    if (ctx.query.access_token || ctx.request.body?.access_token) {
      ctx.throw(
        400,
        'Invalid request: send the access token in the Authorization header'
      );
    }
    const bearer = /^Bearer[ \t]+([^\s,]+)$/i.exec(authorization)?.[1];
    if (authorization && !bearer) {
      ctx.throw(400, 'Invalid request: malformed authorization header');
    }
    const accessToken = bearer ?? cookie;
    if (!accessToken) {
      return ctx.throw(401, 'Unauthorized request: no authentication given');
    }
    const result = await resolveAccessToken(models, accessToken);
    if (!result.ok) return ctx.throw(401, result.error);

    ctx.user = result.user;
    ctx.userPrivileges = result.userPrivileges;
    if (byCookie) {
      ctx.state.authenticatedBySessionCookie = true;
      checkExpectedUser(ctx);
      await extendSession(models, result.token);
    }
    await next();
  };
};

/**
 * The header with which the web UI tells the user it believes it is
 * logged in as. The session cookie is shared by all tabs, so another tab may
 * have logged in as a different user in the meantime.
 */
export const expectedUserHeaderName = 'X-Circus-User';

export const sessionUserChangedHeaderName = 'X-Circus-Session-User-Changed';

const checkExpectedUser = (ctx: Ctx) => {
  const expected = ctx.get(expectedUserHeaderName);
  if (expected && expected !== ctx.user?.userEmail) {
    // Lets the web UI tell this from other conflicts
    ctx.set(sessionUserChangedHeaderName, '1');
    ctx.throw(409, 'The user of this session has changed.');
  }
};

/**
 * Extends the expiration of the current session (sliding expiration).
 */
const extendSession = async (
  models: Models,
  token: Awaited<ReturnType<Models['token']['findById']>>
) => {
  if (token.clientId !== sessionClientId) return;
  const now = Date.now();
  const expiresAt = token.accessTokenExpiresAt.getTime();
  if (expiresAt - now > sessionLifetimeMs - extensionIntervalMs) return;
  await models.token.modifyOne(token.accessToken, {
    accessTokenExpiresAt: new Date(now + sessionLifetimeMs)
  });
};

/**
 * Reads the session cookie from a raw HTTP request (e.g., a WebSocket upgrade).
 */
export const sessionFromRawRequest = (cookieHeader: string | undefined) => {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name === sessionCookieName) return decodeURIComponent(rest.join('='));
  }
  return undefined;
};
