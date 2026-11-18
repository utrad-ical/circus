import type { FunctionService } from '@utrad-ical/circus-lib';
import type { AuthProvider, Models } from '../../interface.ts';

export type VerifyUser = (
  username: string,
  password: string
) => Promise<Awaited<ReturnType<Models['user']['findById']>> | null>;

const createVerifyUser: FunctionService<
  VerifyUser,
  {
    models: Models;
    authProvider: AuthProvider;
    defaultAuthProvider: AuthProvider;
  },
  { fallbackToDefault?: boolean } | undefined
> = async (options, { models, authProvider, defaultAuthProvider }) => {
  return async (username, password) => {
    const [onetime] = await models.onetimeUrl.findAll({
      onetimeString: password
    });
    if (onetime) {
      if (username !== password) return null;
      const { deletedCount } = await models.onetimeUrl.deleteOne({
        onetimeUrlId: onetime.onetimeUrlId
      });
      return deletedCount
        ? await models.user.findById(onetime.userEmail)
        : null;
    }

    let result = await authProvider.check(username, password);
    if (result.result === 'NG' && options?.fallbackToDefault) {
      result = await defaultAuthProvider.check(username, password);
    }
    return result.result === 'OK'
      ? await models.user.findById(result.authenticatedUserEmail)
      : null;
  };
};

createVerifyUser.dependencies = [
  'models',
  'authProvider',
  'defaultAuthProvider'
];

export default createVerifyUser;
