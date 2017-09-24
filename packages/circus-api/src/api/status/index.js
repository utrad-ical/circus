export async function handleGet(ctx, next) {
	ctx.body = {
		status: 'running'
	};
}

export async function handleEcho(ctx, next) {
	ctx.body = ctx.request.body;
}