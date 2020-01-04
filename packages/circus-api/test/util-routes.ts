import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import path from 'path';
import createApp from '../src/createApp';
import { setUpKoaTestWith } from './util-koa';
import { connectMongo, setUpMongoFixture } from './util-mongo';
import mongo from 'mongodb';

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
   * Holds three `AxiosInstance`s used to represent three different
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
  csCore: ReturnType<typeof createMockCsCore>; // TODO: Change this to real CsCore
  /**
   * Shuts down the test Koa server and the DB connection.
   * Make sure to call this on `afterAll()`.
   */
  tearDown: () => void;
}

export const setUpAppForRoutesTest = async () => {
  const { db, dbConnection } = await connectMongo();

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

  const csCore = createMockCsCore();

  const app = await createApp({
    debug: true,
    db,
    cs: csCore,
    pluginResultsPath: '', // dummy
    dicomImageServerUrl: '' // dummy
  });
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
    dbConnection.close();
  };

  return { db, axiosInstances, csCore, tearDown } as ApiTest;
};

const createMockCsCore = () => {
  let status = 'stopped';
  const pluginDefinitions = yaml(
    fs.readFileSync(
      path.join(__dirname, 'fixture/pluginDefinitions.yaml'),
      'utf8'
    )
  ) as any[];

  const queue = [
    {
      status: 'finished',
      jobId: '01dxgwv3k0medrvhdag4mpw9wa'
    }
  ];

  const csCore = {
    daemon: {
      start: async () => (status = 'running'),
      stop: async () => (status = 'stopped'),
      status: async () => status,
      pm2list: async () => status,
      pm2killall: async () => status
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
          : queue.filter(job => job.status === state)
        ).map(item => Object.assign({}, item)),
      register: async (jobId: string, payload: any, priority = 0) =>
        Promise.resolve()
    }
  };

  return csCore;
};
