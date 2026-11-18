import status from 'http-status';
import type { Models } from '../../interface.ts';

type MyList = Awaited<ReturnType<Models['myList']['findByIdOrFail']>>;
import loadMyList from '../../mylist/loadMyList.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import generateUniqueId from '../../utils/generateUniqueId.ts';
import type * as routes from './routes.ts';

/** Returns a my list as the API shows it, without the owner and the items */
export const toUserMyList = (list: MyList) => {
  const { myListId, resourceType, name, editors, createdAt } = list;
  return {
    myListId,
    resourceType,
    name,
    public: list.public,
    editors,
    createdAt
  };
};

/** Returns the my lists owned by the user, oldest first */
export const findMyListsOf = async (models: Models, userEmail: string) =>
  (
    await models.myList.findAll(
      { ownerEmail: userEmail },
      { sort: { createdAt: 1 } }
    )
  ).map(toUserMyList);

export const handleSearch: RouteMiddleware<typeof routes.getMyLists> = ({
  models
}) => {
  return async (ctx, next) => {
    ctx.body = await findMyListsOf(models, ctx.user.userEmail);
  };
};

export const handleGet: RouteMiddleware<typeof routes.getMyList> = ({
  models
}) => {
  return async (ctx, next) => {
    const { list, readable } = await loadMyList(
      ctx,
      models,
      ctx.params.myListId
    );
    if (!readable) ctx.throw(401, 'You cannot read the items of this my list.');
    ctx.body = {
      ...toUserMyList(list),
      resourceIds: list.items.map(item => item.resourceId)
    };
  };
};

export const handlePost: RouteMiddleware<typeof routes.postMyList> = ({
  models
}) => {
  return async (ctx, next) => {
    const myListId = generateUniqueId();
    await models.myList.insert({
      myListId,
      ownerEmail: ctx.user.userEmail,
      ...ctx.request.body,
      editors: [],
      items: []
    });
    ctx.body = { myListId };
    ctx.status = status.CREATED;
  };
};

export const handlePatchList: RouteMiddleware<typeof routes.patchMyList> = ({
  transactionManager
}) => {
  // Changes the attributes of a my list (the name, etc.), not the items
  return async (ctx, next) => {
    await transactionManager.withTransaction(async models => {
      const { list, isOwner } = await loadMyList(
        ctx,
        models,
        ctx.params.myListId,
        { withLock: true }
      );
      if (!isOwner) ctx.throw(401, 'You cannot edit a my list you do not own');
      const { editors } = ctx.request.body;
      for (const editor of editors ?? []) {
        if (editor.type === 'user') {
          const doc = await models.user.findById(editor.userEmail);
          if (!doc) ctx.throw(400, 'Invalid email address is included');
        } else {
          const doc = await models.group.findById(editor.groupId);
          if (!doc) ctx.throw(400, 'Invalid group ID is included');
        }
      }
      await models.myList.modifyOne(list.myListId, ctx.request.body);
      ctx.body = null;
    });
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteMyList> = ({
  models
}) => {
  return async (ctx, next) => {
    const { list, isOwner } = await loadMyList(
      ctx,
      models,
      ctx.params.myListId
    );
    if (!isOwner) ctx.throw(401, 'You cannot delete a my list you do not own');
    await models.myList.deleteOne({ myListId: list.myListId });
    ctx.body = null;
  };
};

const collectionOf = {
  series: 'series',
  clinicalCases: 'clinicalCase',
  pluginJobs: 'pluginJob'
} as const;

export const handlePatchItems: RouteMiddleware<
  typeof routes.patchMyListItems
> = ({ transactionManager }) => {
  return async (ctx, next) => {
    await transactionManager.withTransaction(async models => {
      const { resourceIds, operation } = ctx.request.body;
      const now = new Date();
      const { list, editable } = await loadMyList(
        ctx,
        models,
        ctx.params.myListId,
        { withLock: true }
      );
      if (!editable)
        ctx.throw(401, 'You cannot edit the items of this my list.');

      const coll = collectionOf[list.resourceType];
      const items = [...list.items];
      let changedCount = 0;

      for (const resourceId of resourceIds) {
        const index = items.findIndex(item => item.resourceId === resourceId);
        if (operation === 'add') {
          await models[coll].findByIdOrFail(resourceId, { withLock: true });
          if (index < 0) {
            items.push({ resourceId, createdAt: now });
            changedCount++;
          }
        } else if (index >= 0) {
          items.splice(index, 1);
          changedCount++;
        }
      }

      if (items.length > 1000)
        ctx.throw(400, 'The number of items cannot exceed 1000');
      if (changedCount > 0)
        await models.myList.modifyOne(list.myListId, { items });
      ctx.body = { changedCount };
    });
  };
};
