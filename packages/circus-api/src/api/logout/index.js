import status from 'http-status';

export async function handleGet(ctx, next) {
	if (!ctx.user) {
		ctx.throw(status.UNAUTHORIZED);
	}
	const userEmail = ctx.user.userEmail;
	await ctx.models.token.deleteMany({ userId: userEmail });
	ctx.body = null; // No content
}