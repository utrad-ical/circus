import createCollectionAccessor from './createCollectionAccessor';
import mongo from 'mongodb';
import { Validator } from '../interface';
import { FunctionService } from '@utrad-ical/circus-lib';
import { Models, ModelEntries } from '../interface';

const createModels: FunctionService<
  Models,
  { db: mongo.Db; validator: Validator }
> = async (options, { db, validator }) => {
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
    models[k] = createCollectionAccessor(db, validator, {
      schema: k,
      collectionName: def.col,
      primaryKey: def.pk
    });
  });
  return models as Models;
};

createModels.dependencies = ['db', 'validator'];

export default createModels;
