import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import { findMyListsOf, toUserMyList } from '../mylists/index.ts';

export const handleGet: RouteMiddleware<typeof routes.getLoginInfo> = () => {
  return async (ctx, json) => {
    const user = ctx.var.user;
    return json({
      userEmail: user.userEmail,
      loginId: user.loginId
    });
  };
};

export const handleGetFull: RouteMiddleware<typeof routes.getLoginInfoFull> = ({
  models,
  dicomImageServerUrl
}) => {
  return async (ctx, json) => {
    const { password, ...user } = ctx.var.user;
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
      ctx.var.userPrivileges.domains.includes(defaultDomainValue)
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

    return json({
      ...user,
      ...ctx.var.userPrivileges,
      groups,
      defaultDomain,
      myLists,
      sharedMyLists,
      dicomImageServer: dicomImageServerUrl
    });
  };
};
