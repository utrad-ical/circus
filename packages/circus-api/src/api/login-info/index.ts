import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import { findMyListsOf, toUserMyList } from '../mylists/index.ts';

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

    const sharedMyLists = (
      await models.myList.findAll(
        {
          $or: [
            { 'editors.userEmail': user.userEmail },
            { 'editors.groupId': { $in: user.groups } }
          ]
        },
        { sort: { createdAt: 1 } }
      )
    ).map(list => ({
      owner: list.ownerEmail,
      sharedMyList: toUserMyList(list)
    }));
    const myLists = await findMyListsOf(models, user.userEmail);

    ctx.body = {
      ...user,
      ...ctx.userPrivileges,
      groups,
      defaultDomain,
      myLists,
      sharedMyLists,
      dicomImageServer: dicomImageServerUrl
    };
  };
};
