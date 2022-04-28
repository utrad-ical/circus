import { FunctionService } from '@utrad-ical/circus-lib';
import { TransactionManager, Models, Database, Validator } from 'interface';
import { makeModels } from './db/createModels';

interface Options {
  maxCommitTimeMS: number;
}

const createTransactionManager: FunctionService<
  TransactionManager,
  { database: Database; validator: Validator },
  Options
> = async (opt, deps) => {
  const { maxCommitTimeMS } = opt;
  const { database, validator } = deps;
  const withTransaction = async (fn: (models: Models) => Promise<void>) => {
    const session = database.connection.startSession();
    await session.withTransaction(
      async session => {
        const models = makeModels(database, validator, session);
        await fn(models);
      },
      { maxCommitTimeMS } as any
    );
  };
  return { withTransaction };
};

createTransactionManager.dependencies = ['database', 'validator'];

export default createTransactionManager;
