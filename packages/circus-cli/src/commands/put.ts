import CommandAction from './CommandAction.ts';
import postAction, { SharedOptions } from './post.ts';

const action: CommandAction = deps => {
  return async (resource: string, options: SharedOptions) => {
    await postAction(deps)(resource, { ...options, put: true });
  };
};

export default action;
