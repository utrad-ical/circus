import status from 'http-status';

export const handleGet = () => {
	return async (ctx, next) => {
		if (!ctx.user) ctx.throw(status.UNAUTHORIZEDU);
		ctx.body = ctx.user.preferences;
	};
};

export const handlePut = ({ models }) => {
	return async (ctx, next) => {
		if (!ctx.user) ctx.throw(status.UNAUTHORIZEDU);
		await models.user.modifyOne(ctx.user.userEmail, {
			preferences: ctx.request.body
		});
		ctx.body = null;
	};
};