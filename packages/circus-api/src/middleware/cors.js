/**
 * Simple middleware to append CORS response header.
 */
export default function cors() {
	return async(ctx, next) => {
		ctx.response.set('Access-Control-Allow-Origin', '*');
		await next();
	};
}
