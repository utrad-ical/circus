import createCollectionAccessor from './createCollectionAccessor';
import { Database, Validator, Models, ModelEntries } from '../interface';
import { FunctionService } from '@utrad-ical/circus-lib';
import { ClientSession } from 'mongodb';

/**
 * @param database The Database object containing connection to a Mongo server
 * @param validator The preconfigures validator object
 * @param session Optional session object
 * @returns A new session-less or session-enabled models object
 */
export const makeModels = (
  database: Database,
  validator: Validator,
  session?: ClientSession
) => {
  const modelDefinitions: {
    [key in keyof ModelEntries]: { col: string; pk: string };
  } = {
    user: { col: 'users', pk: 'userEmail' },
    group: { col: 'groups', pk: 'groupId' },
    project: { col: 'projects', pk: 'projectId' },
    series: { col: 'series', pk: 'seriesUid' },
    clinicalCase: { col: 'clinicalCases', pk: 'caseId' },
    serverParam: { col: 'serverParams', pk: 'key' },
    token: { col: 'tokens', pk: 'accessToken' },
    task: { col: 'tasks', pk: 'taskId' },
    plugin: { col: 'pluginDefinitions', pk: 'pluginId' },
    pluginJob: { col: 'pluginJobs', pk: 'jobId' },
    myList: { col: 'myLists', pk: 'myListId' }
  };
  const models: any = {};
  (Object.keys(modelDefinitions) as (keyof ModelEntries)[]).forEach(k => {
    const def = modelDefinitions[k];
    models[k] = createCollectionAccessor(database.db, validator, {
      schema: k,
      collectionName: def.col,
      primaryKey: def.pk,
      session
    });
  });
  return models as Models;
};

const createModels: FunctionService<
  Models,
  { database: Database; validator: Validator }
> = async (options, { database, validator }) => {
  // This creates a session-less models
  return makeModels(database, validator);
};

createModels.dependencies = ['database', 'validator'];

export default createModels;
