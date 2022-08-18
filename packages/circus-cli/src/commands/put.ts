import CommandAction from './CommandAction.js';
import postAction, { SharedOptions } from './post.js';

const action: CommandAction = deps => {
  return async (resource: string, options: SharedOptions) => {
    await postAction(deps)(resource, { ...options, put: true });
  };
};

export default action;
