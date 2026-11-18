import { httpError } from '../middleware/errorHandler.ts';
import status from 'http-status';
import type { CircusContext } from '../typings/middlewares.ts';
import type { Models } from '../interface.ts';

/**
 * Loads a my list and determines what the current user can do with it.
 * The owner and the editors (users or groups) can read and edit the items,
 * and anyone can read them if the list is public.
 */
const loadMyList = async (
  ctx: CircusContext,
  models: Models,
  myListId: string,
  options: { withLock?: boolean } = {}
) => {
  const list = await models.myList.findById(myListId, {
    withLock: options.withLock ?? false
  });
  if (!list) throw httpError(status.NOT_FOUND, 'This my list does not exist');
  const { userEmail, groups } = ctx.var.user as {
    userEmail: string;
    groups: number[];
  };
  const isOwner = list.ownerEmail === userEmail;
  const editable =
    isOwner ||
    list.editors.some(editor =>
      editor.type === 'user'
        ? editor.userEmail === userEmail
        : groups.includes(editor.groupId)
    );
  const readable = editable || list.public;
  return { list, isOwner, readable, editable };
};

export default loadMyList;
