import { RouteMiddleware } from '../../typings/middlewares';
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

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = ctx.params.myListId;
    const list = ctx.user.myLists.find(
      (list: any) => (list.myListId = myListId)
    );
    const docs = await models.myList.findById(myListId);
    if (!list || !docs) ctx.throw(404, 'This my list does not exist');
    ctx.body = list;
  };
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = generateUniqueId();
    const items: MyListItem[] = [];
    const userEmail = ctx.user.userEmail;
    const name = ctx.request.body.name;

    await models.myList.insert({
      myListId,
      items
    });

    const myLists = [
      ...ctx.user.myLists,
      { myListId, resourceType: 'clinicalCases', name, createdAt: new Date() }
    ];
    await models.user.modifyOne(userEmail, { myLists });

    ctx.body = { myListId };
  };
};

export const handlePostItem: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = ctx.params.myListId;
    const resourceIds: { resourceId: string }[] = ctx.request.body.items;
    const newItems = resourceIds.map(r => {
      return { resourceId: r.resourceId, createdAt: new Date() };
    });

    const myList = await models.myList.findByIdOrFail(myListId);
    if (
      myList.items.some((item: any) =>
        newItems.find(r => r.resourceId === item.resourceId)
      )
    )
      ctx.throw(400, 'There is a duplicate item that is already registered.');

    const myLists = [...myList.items, ...newItems];

    await models.myList.modifyOne(myListId, { items: myLists });
    ctx.body = null;
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

export const handleDeleteItem: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = ctx.params.myListId;
    const deletedResourceId = ctx.params.itemId;
    const myList = await models.myList.findByIdOrFail(myListId);
    const newItems = myList.items.filter(
      (item: any) => item.resourceId !== deletedResourceId
    );

    await models.myList.modifyOne(myListId, { items: newItems });
    ctx.body = null;
  };
};
