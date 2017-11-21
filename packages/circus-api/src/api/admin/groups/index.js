export const handleSearch = async (ctx, next) => {
	const groups = await ctx.models.group.findAll(
		{},
		{ sort: { groupId: 1 } }
	);
	ctx.body = groups;
};

export const handleGet = async (ctx, next) => {
	const groupId = parseInt(ctx.params.groupId);
	const group = await ctx.models.group.findByIdOrFail(groupId);
	ctx.body = group;
};

export const handlePut = async (ctx, next) => {
	const groupId = parseInt(ctx.params.groupId);
	await ctx.models.group.modifyOne(groupId, ctx.request.body);
	ctx.body = null;
};
