// import status from 'http-status';

export async function handleGet(ctx, next) {
	const user = ctx.user;
	ctx.body = {
		userEmail: user.userEmail,
		loginId: user.loginId
	};
}

export async function handleGetFull(ctx, next) {
	const user = { ...ctx.user };
	delete user.password;
	ctx.body = user;
}
