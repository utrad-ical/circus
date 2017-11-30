import status from 'http-status';

/**
 * @param {string} role
 */
export default function checkProjectPrivileges({}, role) {
	return async function checkProjectPrivileges(ctx, next) {
		// The user must have appropriate project privilege
		const { accessibleProjects } = ctx.userPrivileges;
		const project = accessibleProjects.find(p => p.projectId === ctx.case.projectId);
		if (project) {
			const okay = project.roles.some(r => r === role);
			if (okay) await next();
			return;
		}
		ctx.throw(
			status.UNAUTHORIZED,
			`You do not have "${role}" privilege of this project.`
		);
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