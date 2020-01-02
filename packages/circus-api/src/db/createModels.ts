import createCollectionAccessor, {
  CollectionAccessor
} from './createCollectionAccessor';

import mongo from 'mongodb';
import { Validator } from '../createValidator';

type CollectionNames =
  | 'user'
  | 'group'
  | 'project'
  | 'series'
  | 'clinicalCase'
  | 'serverParam'
  | 'token'
  | 'task'
  | 'plugin'
  | 'pluginJob';

export default function createModels(db: mongo.Db, validator: Validator) {
  const modelDefinitions: {
    [key in CollectionNames]: { col: string; pk: string };
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
  (Object.keys(modelDefinitions) as CollectionNames[]).forEach(k => {
    const def = modelDefinitions[k];
    models[k] = createCollectionAccessor(db, validator, {
      schema: k,
      collectionName: def.col,
      primaryKey: def.pk
    });
  });
  return models as {
    [key in CollectionNames]: CollectionAccessor;
  };
}

export type Models = ReturnType<typeof createModels>;
