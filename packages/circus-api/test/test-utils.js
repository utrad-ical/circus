import Koa from 'koa';
import { assert } from 'chai';
import * as fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import * as path from 'path';
import { EJSON } from 'bson';
import createApp from '../src/createApp';
import { configureLogger } from '../src/createLogger';
import * as axios from 'axios';
import dotenv from 'dotenv';
import connectDb from '../src/db/connectDb';

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

export async function setUpAppForTest() {
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
  const app = await createApp({ debug: true, db, cs: csCore });
  const server = await listenKoa(app);

  // Prepare axios instances that kick request as these three users
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

  return {
    db,
    dbConnection,
    app,
    axios: axiosInstances,
    csCore,
    ...server
  };
}

export async function tearDownAppForTest(testServer) {
  await tearDownKoa(testServer);
  if (testServer.dbConnection) await testServer.dbConnection.close();
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
  if (!url) throw new Error('CIRCUS_MONGO_TEST_URL must be set');
  return await connectDb(url);
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

function createMockCsCore() {
  let status = 'stopped';
  const pluginDefinitions = yaml(
    fs.readFileSync(
      path.join(__dirname, 'fixture/pluginDefinitions.yaml'),
      'utf8'
    )
  );

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
      get: async pluginId => {
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
      register: async (jobId, payload, priority = 0) => Promise.resolve()
    }
  };

  return csCore;
}
