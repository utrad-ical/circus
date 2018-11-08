import status from 'http-status';

function wrap(data) {
  if (!data) return undefined;
  return Array.isArray(data) ? data : [data];
}

/**
 * Return a middleware that checks various kinds of privilege of the current user.
 */
export default function checkPrivilege({ models }, route) {
  const requiredGlobalPrivilege = wrap(route.requiredGlobalPrivilege);
  const requiredProjectPrivilege = wrap(route.requiredProjectPrivilege);

  return async function checkPrivilege(ctx, next) {
    if (requiredGlobalPrivilege) {
      const { globalPrivileges } = ctx.userPrivileges;
      const okay = requiredGlobalPrivilege.every(rp =>
        globalPrivileges.some(pp => pp === rp)
      );
      if (!okay) {
        ctx.throw(
          status.UNAUTHORIZED,
          'You do not have sufficient privilege to access this resource.'
        );
      }
    }

    if (requiredProjectPrivilege) {
      let projectId;

      // Check project privilege either via caseId or directly via projectId
      if (ctx.params.caseId) {
        const caseId = ctx.params.caseId;
        ctx.case = await models.clinicalCase.findByIdOrFail(caseId);
        projectId = ctx.case.projectId;
      } else if (ctx.params.projectId) {
        projectId = ctx.params.projectId;
      } else {
        ctx.throw(
          status.BAD_REQUEST,
          'No project or case specified to check project privilege.'
        );
      }
      ctx.project = await models.project.findById(projectId);

      const { accessibleProjects } = ctx.userPrivileges;
      let ok = true;
      const project = accessibleProjects.find(p => p.projectId === projectId);
      if (project) {
        ok = requiredProjectPrivilege.every(rp =>
          project.roles.some(r => r === rp)
        );
      } else {
        ok = false;
      }
      if (!ok) {
        ctx.throw(
          status.UNAUTHORIZED,
          `You do not have "${requiredProjectPrivilege.join(
            ','
          )}" privilege of this project.`
        );
      }
    }

    await next();
  };
}
