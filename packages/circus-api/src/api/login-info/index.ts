import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getLoginInfo> = () => {
  return async (ctx, next) => {
    const user = ctx.user;
    ctx.body = {
      userEmail: user.userEmail,
      loginId: user.loginId
    };
  };
};

export const handleGetFull: RouteMiddleware<typeof routes.getLoginInfoFull> = ({
  database,
  models,
  dicomImageServerUrl
}) => {
  return async (ctx, next) => {
    const { password, ...user } = ctx.user;
    const groups = (
      await models.group.findAll({
        groupId: { $in: user.groups }
      })
    ).map(g => g.groupName);
    const defaultDomainValue = (
      await models.serverParam.findById('defaultDomain')
    )?.value;
    const defaultDomain =
      typeof defaultDomainValue === 'string' &&
      ctx.userPrivileges.domains.includes(defaultDomainValue)
        ? defaultDomainValue
        : null;

    const sharedMyLists = await database.db
      .collection('users')
      .aggregate([
        { $unwind: { path: '$myLists' } },
        {
          $match: {
            $or: [
              { 'myLists.editors.userEmail': user.userEmail },
              { 'myLists.editors.groupId': { $in: user.groups } }
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
      dicomImageServer: dicomImageServerUrl
    };
  };
};
