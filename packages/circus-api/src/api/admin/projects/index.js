export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		const projects = await models.project.findAll();
		ctx.body = projects;
	};
};

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const projectId = ctx.params.projectId;
		const project = await models.project.findByIdOrFail(projectId);
		ctx.body = project;
	};
};

export const handlePut = ({ models }) => {
	return async (ctx, next) => {
		const projectId = ctx.params.projectId;
		await models.project.modifyOne(projectId, ctx.request.body);
		ctx.body = null;
	};
};
