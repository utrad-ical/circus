import { z } from 'zod';
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
      /** The schema of the documents in the database */
      schema: z.ZodType;
      col: string;
      pk: string;
    };
  } = {
    user: { schema: s.userDoc, col: 'users', pk: 'userEmail' },
    group: { schema: s.groupDoc, col: 'groups', pk: 'groupId' },
    project: { schema: s.projectDoc, col: 'projects', pk: 'projectId' },
    series: { schema: s.seriesDoc, col: 'series', pk: 'seriesUid' },
    clinicalCase: {
      schema: s.clinicalCaseDoc,
      col: 'clinicalCases',
      pk: 'caseId'
    },
    serverParam: {
      schema: s.serverParamDoc,
      col: 'serverParams',
      pk: 'key'
    },
    token: { schema: s.tokenDoc, col: 'tokens', pk: 'accessToken' },
    plugin: {
      schema: s.pluginDoc,
      col: 'pluginDefinitions',
      pk: 'pluginId'
    },
    pluginJob: { schema: s.pluginJobDoc, col: 'pluginJobs', pk: 'jobId' },
    myList: { schema: s.myListDoc, col: 'myLists', pk: 'myListId' },
    onetimeUrl: {
      schema: s.onetimeUrlDoc,
      col: 'onetimeUrls',
      pk: 'onetimeUrlId'
    }
  };
  const models: any = {};
  (Object.keys(modelDefinitions) as (keyof ModelEntries)[]).forEach(k => {
    const def = modelDefinitions[k];
    models[k] = createCollectionAccessor(database.db, validator, {
      name: k,
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
