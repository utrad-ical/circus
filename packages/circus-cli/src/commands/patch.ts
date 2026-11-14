import type { CommandAction } from './CommandAction.ts';
import postAction, { type SharedOptions } from './post.ts';

const action: CommandAction = deps => {
  return async (resource: string, options: SharedOptions) => {
    await postAction(deps)(resource, { ...options, patch: true });
  };
};

export default action;
