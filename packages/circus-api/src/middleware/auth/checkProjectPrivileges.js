import status from 'http-status';
import { accessibleProjectsForOperation } from '../../privilegeUtils';

/**
 * @param {string} operation
 */
export default function checkProjectPrivileges({ models }, operation) {
	return async function checkProjectPrivileges(ctx, next) {
		// The user must have appropriate project privilege
		const user = ctx.user;
		const accessibleProjects = await accessibleProjectsForOperation(
			models, user, operation
		);
		if (accessibleProjects[ctx.case.projectId] !== true) {
			ctx.throw(
				status.UNAUTHORIZED,
				`You do not have "${operation}" privilege of this project.`
			);
		}
		await next();
	};
}

export function injectCaseAndProject({ models }) {
	return async function injectCaseAndProject(ctx, next) {
		const caseId = ctx.params.caseId;
		if (!caseId) {
			throw new Error('Case ID is not specified.');
		}
		ctx.case = await models.clinicalCase.findById(caseId);
		ctx.project = await models.project.findById(ctx.case);
		await next();
	};
}