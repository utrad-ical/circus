import { FunctionService } from '@utrad-ical/circus-lib';
import { TransactionManager, Models, Database, Validator } from 'interface';

interface Options {
  maxCommitTimeMS: number;
}

const createTransactionManager: FunctionService<
  TransactionManager,
  { db: Database; validator: Validator },
  Options
> = async (opt, deps) => {
  const { maxCommitTimeMS = 1000 } = opt;
  const { db } = deps;
  const withTransaction = async (fn: (models: Models) => Promise<void>) => {
    const session = db.connection.startSession();
    await session.withTransaction(
      async session => {
        const models = createSessionModels(db, validator, session);
        await fn(models);
      },
      { maxCommitTimeMS } as any
    );
  };
  return { withTransaction };
};

createTransactionManager.dependencies = ['db', 'validator'];

export default createTransactionManager;
