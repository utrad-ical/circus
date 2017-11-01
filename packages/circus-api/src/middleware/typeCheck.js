export default function typeCheck(expectedType = 'application/json') {
	return async function typeCheck(ctx, next) {
		if (!/^(POST|PUT|PATCH)$/.test(ctx.request.method) || ctx.request.body.length === 0) {
			await next();
			return;
		}

		if (typeof ctx.request.type !== 'string' || ctx.request.type.length === 0) {
			ctx.throw(401, 'Content-type is unspecified.');
			return;
		}

		const contentType = /^([^;]*)/.exec(ctx.request.type)[1];
		if (contentType !== expectedType) {
			ctx.throw(415, 'This content-type is unsupported.');
			return;
		}
		await next();
	};
}
