import status from 'http-status';

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
	ctx.throw(status.NOT_IMPLEMENTED);
};
