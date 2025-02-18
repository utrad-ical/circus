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
    [key in keyof ModelEntries]: { schema: string; col: string; pk: string };
  } = {
    user: { schema: 'user', col: 'users', pk: 'userEmail' },
    group: { schema: 'group', col: 'groups', pk: 'groupId' },
    project: { schema: 'project', col: 'projects', pk: 'projectId' },
    series: { schema: 'series', col: 'series', pk: 'seriesUid' },
    clinicalCase: {
      schema: 'clinicalCase',
      col: 'clinicalCases',
      pk: 'caseId'
    },
    serverParam: { schema: 'serverParam', col: 'serverParams', pk: 'key' },
    token: { schema: 'token', col: 'tokens', pk: 'accessToken' },
    task: { schema: 'task', col: 'tasks', pk: 'taskId' },
    plugin: {
      schema: 'plugin/remotePlugin',
      col: 'pluginDefinitions',
      pk: 'pluginId'
    },
    pluginJob: { schema: 'pluginJob', col: 'pluginJobs', pk: 'jobId' },
    myList: { schema: 'myList', col: 'myLists', pk: 'myListId' },
    onetimeUrl: { schema: 'onetimeUrl', col: 'onetimeUrls', pk: 'onetimeUrlId' }
  };
  const models: any = {};
  (Object.keys(modelDefinitions) as (keyof ModelEntries)[]).forEach(k => {
    const def = modelDefinitions[k];
    models[k] = createCollectionAccessor(database.db, validator, {
      schema: def.schema,
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
