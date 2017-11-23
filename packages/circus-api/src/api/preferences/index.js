import status from 'http-status';

export const handleGet = () => {
	return async (ctx, next) => {
		ctx.body = ctx.user.preferences;
	};
};

export const handlePost = () => {
	return async (ctx, next) => {
		ctx.throw(status.NOT_IMPLEMENTED);
	};
};