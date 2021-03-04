import { Models } from 'circus-api/src/interface';
import { CircusContext, RouteMiddleware } from '../../typings/middlewares';
import generateUniqueId from '../../utils/generateUniqueId';

export interface MyListItem {
  resourceId: string;
  createdAt: Date;
}

export const handleSearch: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = ctx.user.myLists;
  };
};

const getList = async (
  ctx: CircusContext,
  models: Models,
  myListId: string
) => {
  const list = ctx.user.myLists.find((list: any) => list.myListId === myListId);
  const doc = await models.myList.findById(myListId);
  if (!list || !doc) ctx.throw(404, 'This my list does not exist');
  return { userList: list, list: doc };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = ctx.params.myListId;
    const { userList, list } = await getList(ctx, models, myListId);
    const resourceIds = list.items.map((item: any) => item.resourceId);
    const userListWithResourceIds = { ...userList, resourceIds };
    ctx.body = userListWithResourceIds;
  };
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = generateUniqueId();
    const items: MyListItem[] = [];
    const userEmail = ctx.user.userEmail;
    const { name, resourceType } = ctx.request.body;

    await models.myList.insert({
      myListId,
      items
    });

    const myLists = [
      ...ctx.user.myLists,
      { myListId, resourceType, name, createdAt: new Date() }
    ];
    await models.user.modifyOne(userEmail, { myLists });

    ctx.body = { myListId };
  };
};

export const handleChangeName: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const userMyLists = ctx.user.myLists;
    const targetListId = ctx.params.myListId;
    const newName = ctx.request.body.name;
    const targetList = ctx.user.myLists.find(
      (myList: any) => myList.myListId === targetListId
    );

    if (!targetList) ctx.throw(404, 'No such list');

    targetList.name = newName;

    await models.user.modifyOne(userEmail, { myLists: userMyLists });
    ctx.body = null;
  };
};

export const handleDelete: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const targetListId = ctx.params.myListId;
    const targetList = ctx.user.myLists.find(
      (myList: any) => myList.myListId === targetListId
    );
    if (!targetList) ctx.throw(404, 'No such list');

    const newLists = ctx.user.myLists.filter(
      (myList: any) => myList.myListId !== targetListId
    );
    await models.myList.deleteOne({ myListId: targetListId });
    await models.user.modifyOne(userEmail, { myLists: newLists });
    ctx.body = null;
  };
};

type ListCol = 'series' | 'clinicalCase' | 'pluginJob';
const collMap: { [key: string]: ListCol } = {
  series: 'series',
  clinicalCases: 'clinicalCase',
  pluginJobs: 'pluginJob'
};

export const handlePatchItems: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = ctx.params.myListId;
    const resourceIds: string[] = ctx.request.body.resourceIds;
    const operation: 'add' | 'remove' = ctx.request.body.operation;
    const now = new Date();
    const { userList, list } = await getList(ctx, models, myListId);
    const coll = collMap[userList.resourceType];
    const items = list.items;
    let changedCount = 0;

    for (const resourceId of resourceIds) {
      switch (operation) {
        case 'add':
          await models[coll].findByIdOrFail(resourceId);
          if (
            items.findIndex((item: any) => item.resourceId === resourceId) < 0
          ) {
            items.push({ resourceId, createdAt: now });
            changedCount++;
          }
          break;
        case 'remove': {
          const index = items.findIndex(
            (item: any) => item.resourceId === resourceId
          );
          if (index >= 0) {
            items.splice(index, 1);
            changedCount++;
          }
        }
      }
    }

    if (operation === 'add' && items.length > 1000)
      ctx.throw(400, 'The number of items cannot exceed 1000');
    if (changedCount > 0) await models.myList.modifyOne(myListId, { items });
    ctx.body = { changedCount };
  };
};
