const removePassword = input => {
	const output = { ...input };
	delete output.password;
	return output;
};

export const handleSearch = async (ctx, next) => {
	const users = (await ctx.models.user.findAll()).map(removePassword);
	ctx.body = users;
};

export const handleGet = async (ctx, next) => {
	const user = removePassword(
		await ctx.models.user.findByIdOrFail(ctx.params.userId)
	);
	ctx.body = user;
};

export const handlePut = async (ctx, next) => {
	ctx.throw(400);
};

