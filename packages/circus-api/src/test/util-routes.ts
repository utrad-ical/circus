import type { Deps } from '../typings/middlewares.ts';
import { after } from 'node:test';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import path from 'path';
import createApp from '../createApp.ts';
import { setUpKoaTestWith } from './util-koa.ts';
import { connectMongo, setUpMongoFixture } from './util-mongo.ts';
import type * as cscore from '@utrad-ical/circus-cs-core';
import createTestLogger from './util-logger.ts';
import createValidator from '../createValidator.ts';
import createModels from '../db/createModels.ts';
import createMemoryStorage from '../storage/MemoryStorage.ts';
import createDicomImporter from '../createDicomImporter.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import createDicomTagReader from '../utils/createDicomTagReader.ts';
import createDicomUtilityRunner from '../utils/createDicomUtilityRunner.ts';
import type { TaskManager } from '../createTaskManager.ts';
import createTaskManager from '../createTaskManager.ts';
import type { DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import type { Archiver } from 'archiver';
import { EventEmitter } from 'events';
import createOauthServer from '../middleware/auth/createOauthServer.ts';
import createDefaultAuthProvider from '../middleware/auth/authProvider/DefaultAuthProvider.ts';
import type { Database } from '../interface.ts';
import createTransactionManager from '../createTransactionManager.ts';
import * as ws from 'ws';

/**
 * Holds data used for API route testing.
 * Make sure to call `tearDown()` in the `after()` function.
 */
export interface ApiTest {
  database: Database;

  /**
   * Holds several `AxiosInstance`s that represent three API
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
    /**
     * Carol belongs to the "power user 2" group.
     */
    carol: AxiosInstance;
    /**
     * Dave belongs to the "admin" and "power user 2" group.
     */
    dave: AxiosInstance;
    /**
     * Eve belongs to the "guest" group.
     */
    eve: AxiosInstance;
    /**
     * Frank belongs to the "unprivileged user" group.
     */
    frank: AxiosInstance;
  };
  csCore: cscore.CsCore;
  dicomFileRepository: DicomFileRepository;
  /**
   * Shuts down the test Koa server and the DB connection.
   * Make sure to call this on `after()`.
   */
  tearDown: () => Promise<void>;
  /**
   * The URL of the test Koa endpoint server.
   * The members of `axiosInstances` are configured to use this by default.
   */
  url: string;
  taskManager: TaskManager;
  downloadFileDirectory: string;
}

export const setUpAppForRoutesTest = async (
  overrides: Pick<Deps, 'createDockerFileExtractor'> = {}
) => {
  const database = await connectMongo();
  const db = database.db;

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
    'pluginDefinitions',
    'myLists',
    'onetimeUrls'
  ]);

  const validator = await createValidator(undefined);
  const models = await createModels(undefined, {
    database: database,
    validator
  });
  const transactionManager = await createTransactionManager(
    { maxCommitTimeMS: 10000 },
    { database: database, validator }
  );
  const csCore = createMockCsCore();
  const apiLogger = await createTestLogger();
  const dicomTagReader = await createDicomTagReader({});
  const dicomUtilityRunner = await createDicomUtilityRunner({});
  const dicomFileRepository = new MemoryDicomFileRepository({});
  const dicomImporter = await createDicomImporter(
    {},
    {
      dicomFileRepository,
      apiLogger,
      dicomUtilityRunner,
      dicomTagReader,
      transactionManager
    }
  );

  const downloadFileDirectory = path.join(
    __dirname,
    '../../test/download-test'
  );
  const taskManager = await createTaskManager(
    {
      downloadFileDirectory,
      timeoutMs: 3600 * 1000
    },
    { models, apiLogger }
  );

  const dicomVoxelDumper: DicomVoxelDumper = {
    dump: (series: any, archiver: Archiver) => {
      const events = new EventEmitter();
      (async () => {
        archiver.append('abc', { name: 'dummy.txt' });
        events.emit('volume', 0);
        archiver.finalize();
      })();
      return { stream: archiver, events };
    }
  };

  const authProvider = await createDefaultAuthProvider({}, { models });

  const blobStorage = await createMemoryStorage(undefined);
  await blobStorage.write(
    '5a616841a4fdd6066ee5c7e2d3118e0963ec1fc6',
    Buffer.from('dummy', 'utf-8')
  );

  const app = await createApp(
    {
      debug: true,
      pluginResultsPath: path.join(__dirname, '../../test/plugin-results'),
      pluginCachePath: path.join(__dirname, '../../test/plugin-cache'),
      uploadFileSizeMaxBytes: 200 * 1024 * 1024,
      dicomImageServerUrl: '' // dummy
    },
    {
      validator,
      database,
      apiLogger,
      models,
      blobStorage,
      dicomFileRepository,
      dicomTagReader,
      dicomImporter,
      core: csCore,
      mhdPacker: null as any, // dummy
      rsSeriesRoutes: async () => {}, // dummy
      volumeProvider: null as any, // dummy
      taskManager,
      dicomVoxelDumper,
      oauthServer: await createOauthServer(
        {},
        { defaultAuthProvider: authProvider, models, authProvider }
      ),
      transactionManager,
      ...overrides,
      rsWSServer: new ws.Server({
        noServer: true,
        skipUTF8Validation: true
      }),
      rsWebsocketVolumeConnectionHandlerCreator: () => {
        return null as any; // dummy
      },
      seriesOrientationResolver: async (
        seriesUid: string,
        start: number,
        end: number
      ) => {
        if (seriesUid === '111.222.333.444.555') throw new Error('no image');
        return { start, end, delta: end >= start ? 1 : -1 };
      }
    }
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
    guest: createAxios('2c2fbaea8046df924b8b459879b799c111e9b7f1'),
    carol: createAxios('m47mvv02x2yer00gjroc0za00dger4f455cvedfh'),
    dave: createAxios('98uijkgfhgty43gccccf54rfdvupiazmvr3nwcko'),
    eve: createAxios('ft5y1dkymhc2jh9wf0hrx7dpghj8u12hdk27dnls'),
    frank: createAxios('s10jkttverbemycvpe7bbbbemxcm38cqvrey54hd')
  };

  const tearDown = async () => {
    testServer.tearDown();
    await database.dispose();
  };

  return {
    database,
    axiosInstances,
    csCore,
    tearDown,
    url: testServer.url,
    dicomFileRepository,
    taskManager,
    downloadFileDirectory
  } as ApiTest;
};

const createMockCsCore = () => {
  let status: 'running' | 'stopped' = 'stopped';
  const pluginDefinitions = yaml(
    fs.readFileSync(
      path.join(__dirname, '../../test/fixture/pluginDefinitions.yaml'),
      'utf8'
    )
  ) as cscore.PluginDefinition[];

  const queue = [
    {
      state: 'finished',
      jobId: '01dxgwv3k0medrvhdag4mpw9wa'
    }
  ] as any as cscore.QueueItem<cscore.PluginJobRequest>[];

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
        Promise.resolve(),
      removeFromQueue: async (jobId: string) => true
    }
  } as cscore.CsCore;

  return csCore;
};
