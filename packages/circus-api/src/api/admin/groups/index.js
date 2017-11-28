import performSearch from '../../performSearch';

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		await performSearch(
			models.group, {}, ctx, { defaultSort: { groupId: 1 }}
		);
	};
};

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const groupId = parseInt(ctx.params.groupId);
		const group = await models.group.findByIdOrFail(groupId);
		ctx.body = group;
	};
};

export const handlePut = ({ models }) => {
	return async (ctx, next) => {
		const groupId = parseInt(ctx.params.groupId);
		await models.group.modifyOne(groupId, ctx.request.body);
		ctx.body = null;
	};
};