import Koa from 'koa';
import { assert } from 'chai';
import { MongoClient } from 'mongodb';
import * as fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import * as path from 'path';
import { EJSON } from 'bson';
import createApp from '../src/createApp';
import { configureLogger } from '../src/createLogger';
import * as axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

configureLogger({
  appenders: {
    testLog: {
      type: 'dateFile',
      filename: path.join(__dirname, '..', 'store', 'logs', 'mocha.log'),
      keepFileExt: true
    }
  },
  categories: {
    default: {
      appenders: ['testLog'],
      level: 'ALL'
    }
  }
});

/**
 * This is a helper module for tests using Koa server.
 * @module
 */

export async function setUpKoa(setUpFunc) {
  const app = new Koa();
  await setUpFunc(app);
  return app;
}

export function listenKoa(koaApp) {
  const port = process.env.API_TEST_PORT || 8081;
  return new Promise((resolve, reject) => {
    const instance = koaApp.listen(port, 'localhost', err => {
      if (err) {
        reject(err);
      } else {
        resolve({
          url: `http://localhost:${port}/`,
          instance
        });
      }
    });
  });
}

export function tearDownKoa(server) {
  return new Promise((resolve, reject) => {
    if (server.instance) {
      server.instance.close(err => {
        err ? reject(err) : resolve();
      });
    } else resolve();
  });
}

export async function setUpAppForTest(logMode = 'off') {
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

  const pluginJobsCollection = db.collection('pluginJobs');
  const { csCore, ...csRest } = createMockCsCore(pluginJobsCollection);
  const app = await createApp({ debug: true, db, cs: csCore });
  const server = await listenKoa(app);

  const axiosInstances = {};
  const users = [
    ['alice', '2311aee0435c36ae14c39835539a931a6344714a'],
    ['bob', '8292766837c1901b0a6954f7bda49710316c57da'],
    ['guest', '2c2fbaea8046df924b8b459879b799c111e9b7f1']
  ];
  users.forEach(([user, token]) => {
    axiosInstances[user] = axios.create({
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
  });

  const testHelper = { ...csRest };

  return {
    testHelper,
    db,
    app,
    axios: axiosInstances,
    csCore,
    ...server
  };
}

export async function tearDownAppForTest(testServer) {
  await tearDownKoa(testServer);
  if (testServer.db) await testServer.db.close();
}

export async function asyncThrows(funcOrPromise, type) {
  try {
    await (funcOrPromise instanceof Promise ? funcOrPromise : funcOrPromise());
  } catch (err) {
    if (type) {
      assert.instanceOf(err, type);
    }
    return;
  }
  throw new Error('Function did not throw any error');
}

export async function connectMongo() {
  const url = process.env.CIRCUS_MONGO_TEST_URL;
  const db = await MongoClient.connect(url);
  return db;
}

export async function setUpMongoFixture(db, collections) {
  if (!Array.isArray(collections)) {
    throw new TypeError('collections must be an array');
  }
  for (const colName of collections) {
    const col = db.collection(colName);
    await col.deleteMany({});
    const content = yaml(
      await fs.readFile(path.join(__dirname, 'fixture', colName + '.yaml'))
    );
    if (content) {
      const data = EJSON.parse(JSON.stringify(content));
      for (const row of data) {
        if (!row.createdAt) row.createdAt = new Date();
        if (!row.updatedAt) row.updatedAt = new Date();
      }
      try {
        await col.insertMany(data);
      } catch (err) {
        console.log(err.errors);
        throw err;
      }
    }
  }
}

function createMockCsCore(pluginJobsCollection) {
  let status = 'stopped';
  let defs = mockPlugins();
  const jobs = [];

  const report = async (jobId, type, payload) => {
    if (!jobId) throw new Error('Job ID undefined');
    switch (type) {
      case 'processing':
      case 'finished':
        await pluginJobsCollection.findOneAndUpdate(
          { jobId },
          { $set: { status: type } }
        );
        break;
      case 'error':
        await pluginJobsCollection.findOneAndUpdate(
          { jobId },
          { $set: { status: type, errorMessage: payload } }
        );
        break;
      case 'results':
        await pluginJobsCollection.findOneAndUpdate(
          { jobId },
          { $set: { results: payload } }
        );
        break;
    }
  };

  const csCore = {
    daemon: {
      start: async () => (status = 'running'),
      stop: async () => (status = 'stopped'),
      status: async () => status,
      pm2list: async () => status,
      pm2killall: async () => status
    },
    plugin: {
      update: async newDefs => (defs = newDefs),
      list: async () => defs,
      get: async pluginId => {
        const plugins = defs.filter(i => i.pluginId === pluginId);
        if (plugins.length === 0) throw new Error('No such plugin');
        return plugins.shift();
      }
    },
    job: {
      list: async (state = 'all') =>
        (state === 'all' ? jobs : jobs.filter(job => job.state === state))
          // Since api response filtering harms the original objects
          .map(i => Object.assign({}, i)),
      register: async (jobId, payload, priority = 0) => {
        jobs.push({
          jobId,
          priority,
          payload,
          state: 'wait',
          createdAt: new Date(),
          updatedAt: new Date(),
          startedAt: null
        });
      }
    },
    dispose: async () => {}
  };

  const tick = async () => {
    if (jobs[0]) {
      await report(jobs[0].jobId, 'processing');
      jobs[0].state = 'processing';
      jobs[0].startedAt = new Date();
      return jobs[0];
    }
  };
  const tack = async run => {
    const job = jobs.shift();
    if (job) {
      if (run === undefined) run = async () => ({});
      try {
        const results = await run(job);
        await report(job.jobId, 'results', results);
        await report(job.jobId, 'finished');
        return results;
      } catch (e) {
        await report(job.jobId, 'error', e.message);
      }
    }
  };
  const flush = async () => {
    jobs.splice(0, jobs.length);
    await pluginJobsCollection.deleteMany({});
    defs = mockPlugins();
  };

  const registerJob = async ({
    jobId,
    pluginId,
    userEmail,
    series = [],
    priority = 0,
    status = 'in_queue'
  }) => {
    // status: in_queue' | 'processing' | 'finished' | 'failed' | 'invalidated' | 'cancelled' | 'error'
    if (series.length === 0) {
      series = [
        {
          seriesUid: new Array(5)
            .fill(0)
            .map(i => (100 + Math.floor(Math.random() * 1000)).toString())
            .join('.')
        }
      ];
    }

    const plugin = await csCore.plugin.get(pluginId);
    await pluginJobsCollection.insert({
      jobId,
      pluginId: plugin.pluginId,
      pluginName: plugin.pluginName,
      pluginVersion: plugin.version,
      series,
      userEmail,
      status,
      errorMessage: null,
      results: null,
      startedAt: null,
      feedbacks: [],
      finishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await csCore.job.register(jobId, { pluginId, series }, priority);
  };

  const jobListOverview = async () => {
    const docs = await pluginJobsCollection
      .find({})
      // .project({ _id: 0 })
      // .limit(10)
      .toArray();

    return docs.map(({ jobId, status, results, errorMessage }) => ({
      jobId,
      status,
      results,
      errorMessage
    }));
  };

  return { csCore, registerJob, tick, tack, flush, jobListOverview };
}

const mockPlugins = () => [
  {
    pluginId: 'circus-mock/empty',
    pluginName: 'MOCK-EMPTY',
    version: '1.0',
    type: 'CAD',
    dockerImage:
      'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
  },
  {
    pluginId: 'circus-mock/fails',
    pluginName: 'MOCK-VALIDATION-FAILURE',
    version: '1.0',
    type: 'CAD',
    dockerImage:
      '74c50a99530ef149c16bc6f0cf71b987470282c54e436e9bec6da704f1fcac9c'
  },
  {
    pluginId: 'circus-mock/succeeds',
    pluginName: 'MOCK-SUCCEEDS',
    version: '1.0',
    type: 'CAD',
    dockerImage:
      'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6'
  },
  {
    pluginId: 'circus-mock/timeout',
    pluginName: 'MOCK-SUCCEEDS',
    version: '1.0',
    type: 'CAD',
    dockerImage:
      '918ea418b82e941242d8125375c28bfafa3077108f0df8f7acc8f99d331cf502'
  },
  {
    pluginId: 'circus-mock/error',
    pluginName: 'MOCK-ERROR',
    version: '1.0',
    type: 'CAD',
    dockerImage:
      '9cc56c14129d73930007a4978c7fb60900d7a5d77a29770117a7132dc3a81eaa'
  },
  {
    pluginId: 'circus/mra_cad',
    pluginName: 'MRA-CAD',
    version: '2.12',
    type: 'CAD',
    dockerImage:
      'e3f245078d839ea804e100ada6183edf864624a2859b2a8341a0721378f13f97'
  },
  {
    pluginId: 'circus/lung_cad',
    pluginName: 'LUNG-CAD',
    version: '1.4',
    type: 'CAD',
    dockerImage:
      '4c3bbd30ee5c0ebab258523c585a64e3c62879cdae4804ab5ac2abb0848045a1'
  }
];
