export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		const groups = await models.group.findAll(
			{},
			{ sort: { groupId: 1 } }
		);
		ctx.body = groups;
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