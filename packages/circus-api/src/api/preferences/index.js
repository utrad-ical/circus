import status from 'http-status';

export async function handleGet(ctx, next) {
	ctx.body = ctx.user.preferences;
}

export async function handlePost(ctx, next) {
	ctx.throw(status.NOT_IMPLEMENTED);
}
