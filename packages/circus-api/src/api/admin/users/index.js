import performSearch from '../../performSearch';

const removePassword = input => {
	const output = { ...input };
	delete output.password;
	return output;
};

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		await performSearch(
			models.user, {}, ctx,
			{ transform: removePassword }
		);
	};
};

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const user = removePassword(
			await models.user.findByIdOrFail(ctx.params.userEmail)
		);
		ctx.body = user;
	};
};

export const handlePut = ({ models }) => {
	return async (ctx, next) => {
		const userEmail = ctx.params.userEmail;
		await models.user.modifyOne(userEmail, ctx.request.body);
		ctx.body = null;
	};
};
