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
  db,
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

    const sharedMyLists = await db
      .collection('users')
      .aggregate([
        { $unwind: { path: '$myLists' } },
        {
          $match: {
            $or: [
              { 'myLists.editors.userEmail': user.userEmail },
              { 'myLists.editors.groupId': { $in: [user.groups] } }
            ]
          }
        },
        {
          $project: {
            _id: false,
            owner: '$userEmail',
            sharedMyList: '$myLists'
          }
        }
      ])
      .toArray();

    ctx.body = {
      ...user,
      ...ctx.userPrivileges,
      groups,
      defaultDomain,
      sharedMyLists,
      dicomImageServer: dicomImageServerUrl,
      uploadFileMax: 30,
      uploadFileSizeMaxBytes
    };
  };
};
