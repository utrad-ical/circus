import createCollectionAccessor, {
  CollectionAccessor
} from './createCollectionAccessor';
import mongo from 'mongodb';
import { Validator } from '../createValidator';
import { FunctionService } from '@utrad-ical/circus-lib';

interface ModelEntries {
  user: any;
  group: any;
  project: any;
  series: any;
  clinicalCase: any;
  serverParam: any;
  token: any;
  task: any;
  plugin: any;
  pluginJob: any;
}

export type Models = {
  [key in keyof ModelEntries]: CollectionAccessor<ModelEntries[key]>;
};

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
    pluginJob: { col: 'pluginJobs', pk: 'jobId' }
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
