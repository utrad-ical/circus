import { httpError } from '../../middleware/errorHandler.ts';
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
  return async (ctx, json) => {
    return json(await findMyListsOf(models, ctx.var.user.userEmail));
  };
};

export const handleGet: RouteMiddleware<typeof routes.getMyList> = ({
  models
}) => {
  return async (ctx, json) => {
    const { list, readable } = await loadMyList(
      ctx,
      models,
      ctx.req.param().myListId
    );
    if (!readable)
      throw httpError(401, 'You cannot read the items of this my list.');
    return json({
      ...toUserMyList(list),
      resourceIds: list.items.map(item => item.resourceId)
    });
  };
};

export const handlePost: RouteMiddleware<typeof routes.postMyList> = ({
  models
}) => {
  return async (ctx, json) => {
    const myListId = generateUniqueId();
    await models.myList.insert({
      myListId,
      ownerEmail: ctx.var.user.userEmail,
      ...ctx.req.valid('json'),
      editors: [],
      items: []
    });
    return json({ myListId }, status.CREATED);
  };
};

export const handlePatchList: RouteMiddleware<typeof routes.patchMyList> = ({
  transactionManager
}) => {
  // Changes the attributes of a my list (the name, etc.), not the items
  return async ctx => {
    await transactionManager.withTransaction(async models => {
      const { list, isOwner } = await loadMyList(
        ctx,
        models,
        ctx.req.param().myListId,
        { withLock: true }
      );
      if (!isOwner)
        throw httpError(401, 'You cannot edit a my list you do not own');
      const { editors } = ctx.req.valid('json');
      for (const editor of editors ?? []) {
        if (editor.type === 'user') {
          const doc = await models.user.findById(editor.userEmail);
          if (!doc) throw httpError(400, 'Invalid email address is included');
        } else {
          const doc = await models.group.findById(editor.groupId);
          if (!doc) throw httpError(400, 'Invalid group ID is included');
        }
      }
      await models.myList.modifyOne(list.myListId, ctx.req.valid('json'));
    });
    return ctx.body(null, 204);
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteMyList> = ({
  models
}) => {
  return async ctx => {
    const { list, isOwner } = await loadMyList(
      ctx,
      models,
      ctx.req.param().myListId
    );
    if (!isOwner)
      throw httpError(401, 'You cannot delete a my list you do not own');
    await models.myList.deleteOne({ myListId: list.myListId });
    return ctx.body(null, 204);
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
  return async (ctx, json) => {
    const changedCount = await transactionManager.withTransaction(
      async models => {
        const { resourceIds, operation } = ctx.req.valid('json');
        const now = new Date();
        const { list, editable } = await loadMyList(
          ctx,
          models,
          ctx.req.param().myListId,
          { withLock: true }
        );
        if (!editable)
          throw httpError(401, 'You cannot edit the items of this my list.');

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
          throw httpError(400, 'The number of items cannot exceed 1000');
        if (changedCount > 0)
          await models.myList.modifyOne(list.myListId, { items });
        return changedCount;
      }
    );
    return json({ changedCount });
  };
};
