import type { Deps } from '../typings/middlewares.ts';
import { after } from 'node:test';
import type { TestHttpClient } from './util-http.ts';
import { createTestHttpClient } from './util-http.ts';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import createApp from '../createApp.ts';
import { setUpTestServer } from './util-server.ts';
import { connectMongo, setUpMongoFixture } from './util-mongo.ts';
import type * as cscore from '@utrad-ical/circus-cs-core';
import createTestLogger from './util-logger.ts';
import createValidator from '../createValidator.ts';
import createModels from '../db/createModels.ts';
import createMemoryStorage from '../storage/MemoryStorage.ts';
import createDicomImporter from '../createDicomImporter.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import {
  MemoryDicomFileRepository,
  ServiceLoader
} from '@utrad-ical/circus-lib';
import createDicomTagReader from '../utils/createDicomTagReader.ts';
import createDicomUtilityRunner from '../utils/createDicomUtilityRunner.ts';
import createProgressManager, {
  type ProgressManager
} from '../createProgressManager.ts';
import type { DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import { packTar } from 'modern-tar';
import { EventEmitter } from 'events';
import createVerifyUser from '../middleware/auth/createVerifyUser.ts';
import createDefaultAuthProvider from '../middleware/auth/authProvider/DefaultAuthProvider.ts';
import type { Database } from '../interface.ts';
import createTransactionManager from '../createTransactionManager.ts';
import createMhdPacker from '../case/createMhdPacker.ts';
import {
  type DicomExtractorWorker,
  type RsServices,
  configureRsServiceLoader,
  dicomImageExtractor
} from '@utrad-ical/circus-rs/server';
import * as ws from 'ws';

/**
 * Holds data used for API route testing.
 * Make sure to call `tearDown()` in the `after()` function.
 */
export interface ApiTest {
  database: Database;

  /**
   * Holds several `TestHttpClient`s that represent API
   * users with different privileges.
   * They target the test server and return 4xx/5xx responses for assertions.
   */
  clients: {
    /**
     * Alice belongs to the "admin" group.
     */
    alice: TestHttpClient;
    /**
     * Bob belongs to the "power user" group.
     */
    bob: TestHttpClient;
    /**
     * Guest belongs to the "guest" group and has no explict privilege.
     */
    guest: TestHttpClient;
    /**
     * Carol belongs to the "power user 2" group.
     */
    carol: TestHttpClient;
    /**
     * Dave belongs to the "admin" and "power user 2" group.
     */
    dave: TestHttpClient;
    /**
     * Eve belongs to the "guest" group.
     */
    eve: TestHttpClient;
    /**
     * Frank belongs to the "unprivileged user" group.
     */
    frank: TestHttpClient;
  };
  csCore: cscore.CsCore;
  dicomFileRepository: DicomFileRepository;
  /**
   * Shuts down the test HTTP server and the DB connection.
   * Make sure to call this on `after()`.
   */
  tearDown: () => Promise<void>;
  /**
   * The URL of the test HTTP endpoint server.
   * The members of `clients` are configured to use this by default.
   */
  url: string;
  progressManager: ProgressManager;
}

export const setUpAppForRoutesTest = async (
  overrides: Pick<Deps, 'createDockerFileExtractor'> &
    Partial<
      Pick<
        Parameters<typeof createApp>[1],
        'rsWebsocketVolumeConnectionHandlerCreator'
      >
    > = {}
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
  const logger = await createTestLogger();
  const dicomTagReader = await createDicomTagReader({});
  const dicomUtilityRunner = await createDicomUtilityRunner({});
  const dicomFileRepository = new MemoryDicomFileRepository({});
  const dicomImporter = await createDicomImporter(
    {},
    {
      dicomFileRepository,
      logger,
      dicomUtilityRunner,
      dicomTagReader,
      transactionManager
    }
  );

  const progressManager = await createProgressManager({});

  // Extracts in the main thread
  const extract = dicomImageExtractor();
  const dicomExtractorWorker = Object.assign(
    async (buffer: ArrayBuffer) => extract(buffer),
    { dispose: async () => {} }
  ) as DicomExtractorWorker;

  const rsLoader = new ServiceLoader<RsServices>();
  configureRsServiceLoader(rsLoader);
  rsLoader.registerFactory('logger', async () => logger);
  rsLoader.registerFactory(
    'dicomFileRepository',
    async () => dicomFileRepository
  );
  rsLoader.registerFactory(
    'dicomExtractorWorker',
    async () => dicomExtractorWorker
  );
  const volumeProvider = await rsLoader.get('volumeProvider');

  // Writes the received series as `series.json`
  const dicomVoxelDumper: DicomVoxelDumper = {
    dump: series => {
      const file = (name: string, body: string) => ({
        header: { name, size: Buffer.byteLength(body), type: 'file' as const },
        body
      });
      const stream = new ReadableStream<Uint8Array>({
        start: async controller => {
          controller.enqueue(
            await packTar([
              file('dummy.txt', 'abc'),
              file('series.json', JSON.stringify(series))
            ])
          );
          controller.close();
        }
      });
      return { stream, events: new EventEmitter() };
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
      pluginResultsPath: path.join(
        import.meta.dirname,
        '../../test/plugin-results'
      ),
      pluginCachePath: path.join(
        import.meta.dirname,
        '../../test/plugin-cache'
      ),
      uploadFileSizeMaxBytes: 200 * 1024 * 1024,
      dicomImageServerUrl: '' // dummy
    },
    {
      validator,
      database,
      logger,
      models,
      blobStorage,
      dicomFileRepository,
      dicomTagReader,
      dicomImporter,
      core: csCore,
      mhdPacker: await createMhdPacker(undefined, {
        models,
        dicomFileRepository,
        dicomExtractorWorker,
        blobStorage,
        logger
      }),
      rsSeriesRoutes: await rsLoader.get('rsSeriesRoutes'),
      volumeProvider,
      progressManager,
      dicomVoxelDumper,
      verifyUser: await createVerifyUser(
        {},
        { defaultAuthProvider: authProvider, models, authProvider }
      ),
      transactionManager,
      rsWSServer: new ws.WebSocketServer({
        noServer: true,
        skipUTF8Validation: true
      }),
      rsWebsocketVolumeConnectionHandlerCreator: () => {
        return null as any; // dummy
      },
      ...overrides,
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

  const testServer = await setUpTestServer(app);

  // Prepare HTTP clients that kick HTTP requests as these users
  const clientForToken = (token: string) =>
    createTestHttpClient(testServer.url, { Authorization: `Bearer ${token}` });

  const clients = {
    alice: clientForToken('2311aee0435c36ae14c39835539a931a6344714a'),
    bob: clientForToken('8292766837c1901b0a6954f7bda49710316c57da'),
    guest: clientForToken('2c2fbaea8046df924b8b459879b799c111e9b7f1'),
    carol: clientForToken('m47mvv02x2yer00gjroc0za00dger4f455cvedfh'),
    dave: clientForToken('98uijkgfhgty43gccccf54rfdvupiazmvr3nwcko'),
    eve: clientForToken('ft5y1dkymhc2jh9wf0hrx7dpghj8u12hdk27dnls'),
    frank: clientForToken('s10jkttverbemycvpe7bbbbemxcm38cqvrey54hd')
  };

  const tearDown = async () => {
    await testServer.tearDown();
    await database.dispose();
  };

  return {
    database,
    clients,
    csCore,
    tearDown,
    url: testServer.url,
    dicomFileRepository,
    progressManager
  } as ApiTest;
};

const createMockCsCore = () => {
  let status: 'running' | 'stopped' = 'stopped';
  const pluginDefinitions = yaml.safeLoad(
    fs.readFileSync(
      path.join(
        import.meta.dirname,
        '../../test/fixture/pluginDefinitions.yaml'
      ),
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
