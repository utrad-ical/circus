import { RouteMiddleware } from '../../typings/middlewares';
import bytes from 'bytes';

// import status from 'http-status';

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    const user = ctx.user;
    ctx.body = {
      userEmail: user.userEmail,
      loginId: user.loginId
    };
  };
};

export const handleGetFull: RouteMiddleware = ({
  models,
  dicomImageServerUrl,
  uploadFileSizeMaxBytes
}) => {
  return async (ctx, next) => {
    const user = { ...ctx.user };
    delete user.password;
    const groups = (
      await models.group.findAll({
        groupId: { $in: user.groups }
      })
    ).map(g => g.groupName);
    const defaultDomainValue = (
      await models.serverParam.findById('defaultDomain')
    )?.value;
    const defaultDomain =
      ctx.userPrivileges.domains.indexOf(defaultDomainValue) >= 0
        ? defaultDomainValue
        : null;
    ctx.body = {
      ...user,
      ...ctx.userPrivileges,
      groups,
      defaultDomain,
      dicomImageServer: dicomImageServerUrl,
      uploadFileMax: 30,
      uploadFileSizeMax: bytes(uploadFileSizeMaxBytes)
    };
  };
};
