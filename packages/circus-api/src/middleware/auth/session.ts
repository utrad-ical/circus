import { randomBytes } from 'node:crypto';
import type koa from 'koa';
import type { Models } from '../../interface.ts';

type Ctx = koa.ParameterizedContext<any, any>;

/**
 * Browser sessions.
 *
 * A browser session is an access token stored in the `tokens` collection,
 * like the ones issued by the OAuth server, but it is delivered as an
 * HttpOnly cookie instead of being handed to the web UI.
 * Requests with the cookie are authenticated by the OAuth server
 * as if they had the token as a Bearer token.
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
export const checkCsrfHeader = (ctx: Ctx) => {
  if (!isSafeMethod(ctx.method) && !ctx.get(csrfHeaderName)) {
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

/**
 * Wraps the OAuth authentication middleware so that a request can be
 * authenticated either with a Bearer token (API clients) or with the
 * session cookie (web UI).
 */
export const withSessionCookie = (
  models: Models,
  authenticate: koa.Middleware
): koa.Middleware => {
  return async (ctx, next) => {
    const cookie = ctx.cookies.get(sessionCookieName);
    const byCookie = !ctx.get('Authorization') && !!cookie;
    if (byCookie) {
      checkCsrfHeader(ctx);
      ctx.request.headers.authorization = `Bearer ${cookie}`;
    }
    await authenticate(ctx, async () => {
      if (byCookie) await extendSession(ctx, models);
      await next();
    });
  };
};

/**
 * Extends the expiration of the current session (sliding expiration).
 */
const extendSession = async (ctx: Ctx, models: Models) => {
  const token = ctx.state.oauth?.token;
  if (!token || token.client?.id !== sessionClientId) return;
  const now = Date.now();
  const expiresAt = new Date(token.accessTokenExpiresAt).getTime();
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
