export const handleSearch = async (ctx, next) => {
	const projects = await ctx.models.project.findAll();
	ctx.body = projects;
};

export const handleGet = async (ctx, next) => {
	const projectId = ctx.params.projectId;
	const project = await ctx.models.project.findByIdOrFail(projectId);
	ctx.body = project;
};

export const handlePut = async (ctx, next) => {
	const projectId = ctx.params.projectId;
	await ctx.models.project.modifyOne(projectId, ctx.request.body);
	ctx.body = null;
};
