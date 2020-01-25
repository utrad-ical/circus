import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import path from 'path';
import { createKoa } from '../src/createApp';
import { setUpKoaTestWith } from './util-koa';
import { connectMongo, setUpMongoFixture } from './util-mongo';
import mongo from 'mongodb';
import * as cscore from '@utrad-ical/circus-cs-core';
import createTestLogger from './util-logger';
import createValidator from '../src/createValidator';
import createModels from '../src/db/createModels';
import createMemoryStorage from '../src/storage/MemoryStorage';
import DicomImporter from '../src/DicomImporter';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';

/**
 * Holds data used for API route testing.
 * Make sure to call `tearDown()` in the `afterAll()` function.
 */
export interface ApiTest {
  /**
   * The mongo.Db instance shared among the test file.
   */
  db: mongo.Db;
  /**
   * Holds three `AxiosInstance`s that represent three API
   * users with different privileges.
   * Its `baseURL` is configured to point to the test sever,
   * and its `validateStatus` is configured not to throw on any 4xx/5xx errors.
   */
  axiosInstances: {
    /**
     * Alice belongs to the "admin" group.
     */
    alice: AxiosInstance;
    /**
     * Bob belongs to the "power user" group.
     */
    bob: AxiosInstance;
    /**
     * Guest belongs to the "guest" group and has no explict privilege.
     */
    guest: AxiosInstance;
  };
  csCore: cscore.CsCore;
  /**
   * Shuts down the test Koa server and the DB connection.
   * Make sure to call this on `afterAll()`.
   */
  tearDown: () => void;
  /**
   * The URL of the test Koa endpoint server.
   * The members of `axiosInstances` are configured to use this by default.
   */
  url: string;
}

export const setUpAppForRoutesTest = async () => {
  const db = await connectMongo();

  await setUpMongoFixture(db, [
    'series',
    'clinicalCases',
    'groups',
    'projects',
    'users',
    'serverParams',
    'tokens',
    'tasks',
    'pluginJobs',
    'pluginDefinitions'
  ]);

  const validator = await createValidator(undefined);
  const models = await createModels(undefined, { db, validator });
  const csCore = createMockCsCore();
  const logger = await createTestLogger();

  const dicomImporter = process.env.DICOM_UTILITY
    ? new DicomImporter(new MemoryDicomFileRepository({}), models, {
        utility: process.env.DICOM_UTILITY
      })
    : undefined;

  const app = await createKoa(
    {
      validator,
      db,
      logger,
      models,
      blobStorage: await createMemoryStorage(undefined),
      dicomImporter,
      pluginResultsPath: '', // dummy
      cs: csCore,
      volumeProvider: null as any, // dummy
      uploadFileSizeMax: '200mb',
      dicomImageServerUrl: '' // dummy
    },
    { debug: true },
    async () => {}
  );
  const testServer = await setUpKoaTestWith(app);

  // Prepare axios instances that kick HTTP requests as these users
  const createAxios = (token: string) =>
    axios.create({
      baseURL: testServer.url,
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

  const axiosInstances = {
    alice: createAxios('2311aee0435c36ae14c39835539a931a6344714a'),
    bob: createAxios('8292766837c1901b0a6954f7bda49710316c57da'),
    guest: createAxios('2c2fbaea8046df924b8b459879b799c111e9b7f1')
  };

  const tearDown = async () => {
    testServer.tearDown();
    await db.dispose();
  };

  return {
    db,
    axiosInstances,
    csCore,
    tearDown,
    url: testServer.url
  } as ApiTest;
};

const createMockCsCore = () => {
  let status: 'running' | 'stopped' = 'stopped';
  const pluginDefinitions = yaml(
    fs.readFileSync(
      path.join(__dirname, 'fixture/pluginDefinitions.yaml'),
      'utf8'
    )
  ) as cscore.PluginDefinition[];

  const queue = ([
    {
      state: 'finished',
      jobId: '01dxgwv3k0medrvhdag4mpw9wa'
    }
  ] as any) as cscore.QueueItem<cscore.PluginJobRequest>[];

  const csCore = {
    daemon: {
      start: async () => ((status = 'running'), undefined),
      stop: async () => ((status = 'stopped'), undefined),
      status: async () => status,
      pm2list: async () => {},
      pm2killall: async () => {}
    },
    plugin: {
      list: async () => pluginDefinitions,
      get: async (pluginId: string) => {
        const plugin = pluginDefinitions.find(p => p.pluginId === pluginId);
        if (!plugin) throw new Error('No such plugin');
        return plugin;
      }
    },
    job: {
      list: async (state = 'all') =>
        (state === 'all'
          ? queue
          : queue.filter(job => job.state === state)
        ).map(item => Object.assign({}, item)),
      register: async (jobId: string, payload: any, priority = 0) =>
        Promise.resolve()
    }
  } as cscore.CsCore;

  return csCore;
};
