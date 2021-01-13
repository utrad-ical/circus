import { RouteMiddleware } from '../../typings/middlewares';
import generateUniqueId from '../../utils/generateUniqueId';

export interface MyListItem {
  resourceId: string;
  createdAt: Date;
}

export const handleSearch: RouteMiddleware = () => {
  return async (ctx, next) => {};
};

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {};
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
      { myListId, name, createdAt: new Date() }
    ];
    await models.user.modifyOne(userEmail, { myLists });

    ctx.body = { myListId };
  };
};

export const handlePostItem: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const myListId = ctx.params.myListId;
    const resourceIds = ctx.request.body.items;
    resourceIds.map(r => {
      r.createdAt = new Date();
    });

    const myList = await models.myList.findByIdOrFail(myListId);
    // TODO: 重複チェック

    const myLists = [...myList.items, ...resourceIds];

    await models.myList.modifyOne(myListId, { items: myLists });
    ctx.body = null;
  };
};

export const handleChangeName: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const userMyLists = ctx.user.myLists;
    const changedNameListId = ctx.params.myListId;
    const newName = ctx.request.body.name;
    const changedNameList = ctx.user.myLists.find(
      ({ myListId }) => myListId === changedNameListId
    );

    if (!changedNameList) ctx.throw(400, '');

    changedNameList.name = newName;

    await models.user.modifyOne(userEmail, { myLists: userMyLists });
    ctx.body = null;
  };
};

export const handleDelete: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const deletedListId = ctx.params.myListId;
    const newLists = ctx.user.myLists.filter(
      ({ myListId }) => myListId !== deletedListId
    );

    await models.myList.deleteOne({ myListId: deletedListId });
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
      ({ resourceId }) => resourceId !== deletedResourceId
    );

    await models.myList.modifyOne(myListId, { items: newItems });
    ctx.body = null;
  };
};
