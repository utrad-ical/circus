import { AuthProvider, Models } from 'interface';
import nodepass from 'node-php-password';
import { FunctionService } from '@utrad-ical/circus-lib';

const createDefaultAuthProvider: FunctionService<
  AuthProvider,
  { models: Models },
  {}
> = async (opt, deps) => {
  const { models } = deps;
  return {
    check: async (username, password) => {
      const users = await models.user.findAll({
        $or: [{ userEmail: username }, { loginId: username }]
      });
      if (!users.length) return { result: 'NG' };
      const user = users[0];
      if (nodepass.verify(password, user.password)) {
        return {
          result: 'OK',
          authenticatedUserEmail: user.userEmail
        };
      }
      return { result: 'NG' };
    },

    describe: () => 'Default auth provider'
  };
};

createDefaultAuthProvider.dependencies = ['models'];
export default createDefaultAuthProvider;
