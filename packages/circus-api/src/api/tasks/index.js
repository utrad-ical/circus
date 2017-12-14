import performSearch from '../performSearch';
import TaskReporter from '../task';
import status from 'http-status';

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		const userEmail = ctx.user.userEmail;
		const filter = { owner: userEmail };
		const opts = {
			defaultSort: { createdAt: -1 }
		};
		await performSearch(models.task, filter, ctx, opts);
	};
};

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const taskId = ctx.params.taskId;
		const task = await models.task.findByIdOrFail(taskId);
		if (task.owner !== ctx.user.userEmail) {
			ctx.throw(status.FORBIDDEN);
		}
		ctx.body = task;
	};
};

export const handleProgress = ({ models }) => {
	return async (ctx, next) => {
		const taskId = ctx.params.taskId;
		const userEmail = ctx.user.userEmail;
		const reporter = new TaskReporter(taskId, userEmail, { models });
		reporter.report(ctx);
	};
};