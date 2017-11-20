import status from 'http-status';
import { access } from 'fs';

/**
 * @param {string} operation
 */
export default function checkProjectPrivileges(operation) {

	const operations = [
		'read', 'write', 'addSeries', 'viewPersonalInfo', 'moderate'
	];
	if (typeof operation !== 'string' || operations.indexOf(operation) < 0) {
		throw new TypeError('Unknown project operation type.');
	}

	return async function(ctx, next) {
		const user = ctx.user;
		const caseId = ctx.params.caseId;
		if (!caseId) {
			throw new Error('Case ID is not specified.');
		}
		ctx.case = await ctx.models.clinicalCase.findById(caseId);
		ctx.project = await ctx.models.project.findById(ctx.case);

		// The user must have
		const accessibleProjectsForOperation = {};
		for (const groupId of user.groups) {
			const group = await ctx.models.group.findById(groupId);
			for (const projId of group[operation + 'Projects']) {
				accessibleProjectsForOperation[projId] = true;
			}
		}

		if (accessibleProjectsForOperation[ctx.case.projectId] !== true) {
			ctx.throw(
				status.UNAUTHORIZED,
				`You do not have "${operation}" privilege of this project.`
			);
		}
		await next();
	};
}