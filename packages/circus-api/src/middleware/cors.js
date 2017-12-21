/**
 * Simple middleware to append CORS response header.
 */
export default function cors(origin = '*') {
  return async function cors(ctx, next) {
    ctx.response.set('Access-Control-Allow-Origin', origin);
    ctx.response.set('Access-Control-Allow-Methods', 'POST, GET, PUT, OPTIONS');
    ctx.response.set('Access-Control-Allow-Credentials', 'true');
    ctx.response.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type'
    );
    ctx.response.set('Access-Control-Max-Age', '86400');
    await next();
  };
}
