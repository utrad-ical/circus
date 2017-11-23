// import status from 'http-status';

export const handleGet = () => {
	return async (ctx, next) => {
		const user = ctx.user;
		ctx.body = {
			userEmail: user.userEmail,
			loginId: user.loginId
		};
	};
};

export const handleGetFull = () => {
	return async (ctx, next) => {
		const user = { ...ctx.user };
		delete user.password;
		ctx.body = user;
	};
};
