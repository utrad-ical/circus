import status from 'http-status';
import performSearch from '../../performSearch';
import { generateProjectId } from '../../../utils';

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		await performSearch(models.project, {}, ctx);
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

export const handlePost = ({ models }) => {
	return async (ctx, next) => {
		const projectId = generateProjectId();
		if ('projectId' in ctx.request.body) {
			ctx.throw(status.BAD_REQUEST, 'Project ID cannot be specified');
		}
		const inserting = { ...ctx.request.body, projectId };
		await models.project.insert(inserting);
		ctx.body = { projectId };
	};
};