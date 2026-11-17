import type { z } from 'zod';
import * as s from '../schemas/index.ts';
import createCollectionAccessor from './createCollectionAccessor.ts';
import type {
  Database,
  Validator,
  Models,
  ModelEntries
} from '../interface.ts';
import type { FunctionService } from '@utrad-ical/circus-lib';
import type { ClientSession } from 'mongodb';

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
    [key in keyof ModelEntries]: {
      schema: z.ZodType | z.ZodType[];
      col: string;
      pk: string;
    };
  } = {
    user: { schema: s.user, col: 'users', pk: 'userEmail' },
    group: { schema: s.group, col: 'groups', pk: 'groupId' },
    project: { schema: s.project, col: 'projects', pk: 'projectId' },
    series: { schema: s.series, col: 'series', pk: 'seriesUid' },
    clinicalCase: {
      schema: s.clinicalCase,
      col: 'clinicalCases',
      pk: 'caseId'
    },
    serverParam: { schema: s.serverParam, col: 'serverParams', pk: 'key' },
    token: { schema: s.token, col: 'tokens', pk: 'accessToken' },
    plugin: {
      schema: [s.plugin, s.remotePlugin],
      col: 'pluginDefinitions',
      pk: 'pluginId'
    },
    pluginJob: { schema: s.pluginJob, col: 'pluginJobs', pk: 'jobId' },
    myList: { schema: s.myList, col: 'myLists', pk: 'myListId' },
    onetimeUrl: { schema: s.onetimeUrl, col: 'onetimeUrls', pk: 'onetimeUrlId' }
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
