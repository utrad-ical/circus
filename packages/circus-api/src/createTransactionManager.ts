import type { FunctionService } from '@utrad-ical/circus-lib';
import type {
  TransactionManager,
  Models,
  Database,
  Validator
} from './interface.ts';
import { makeModels } from './db/createModels.ts';

interface Options {
  maxCommitTimeMS?: number;
}

type TransactionManagerService = FunctionService<
  TransactionManager,
  { database: Database; validator: Validator },
  Options
>;

/**
 * Creates the transaction manager service.
 * `makeModelsFn` can be replaced in tests.
 */
export const createTransactionManagerFactory = (
  makeModelsFn: typeof makeModels = makeModels
): TransactionManagerService => {
  const service: TransactionManagerService = async (opt = {}, deps) => {
    const { maxCommitTimeMS = 2000 } = opt;
    const { database, validator } = deps;
    const withTransaction = async (fn: (models: Models) => Promise<void>) => {
      const session = database.connection.startSession();
      await session.withTransaction(
        async session => {
          const models = makeModelsFn(database, validator, session);
          await fn(models);
        },
        { maxCommitTimeMS } as any
      );
    };
    return { withTransaction };
  };
  service.dependencies = ['database', 'validator'];
  return service;
};

const createTransactionManager = createTransactionManagerFactory();

export default createTransactionManager;
