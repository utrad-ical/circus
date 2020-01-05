import { RouteMiddleware } from '../../typings/middlewares';

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
  uploadFileSizeMax
}) => {
  return async (ctx, next) => {
    const user = { ...ctx.user };
    delete user.password;
    const groups = (
      await models.group.findAll({
        groupId: { $in: user.groups }
      })
    ).map(g => g.groupName);
    ctx.body = {
      ...user,
      ...ctx.userPrivileges,
      groups,
      dicomImageServer: dicomImageServerUrl,
      uploadFileMax: 30,
      uploadFileSizeMax: uploadFileSizeMax.toUpperCase()
    };
  };
};
