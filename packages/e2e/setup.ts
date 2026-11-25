// Prepares a fresh database, starts the API and the built web UI,
// and adds the data the tests open. Returns the teardown function.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { apiPort, mongoUrl, webPort } from './env.ts';

const root = path.resolve(import.meta.dirname, '../..');
const apiDir = path.join(root, 'packages/circus-api');
const webUiDir = path.join(root, 'packages/circus-web-ui');
const dicomDir = path.join(apiDir, 'test/dicom');
const vite = path.join(
  path.dirname(
    createRequire(path.join(webUiDir, 'package.json')).resolve(
      'vite/package.json'
    )
  ),
  'bin/vite.js'
);

const apiUrl = `http://127.0.0.1:${apiPort}/api`;

export const pluginId =
  'e2e0000000000000000000000000000000000000000000000000000000000001';
export const jobId = '01e2e0000000000000000000j0';

const waitFor = async (url: string, timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`${url} did not respond in time`);
};

/** Calls the API as the default admin user */
const createApiClient = async () => {
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  const login = await fetch(`${apiUrl}/session`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'circus', password: 'circus' })
  });
  if (!login.ok) throw new Error(`Login failed: ${login.status}`);
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]);
  return async (endpoint: string, init: RequestInit = {}) => {
    const res = await fetch(`${apiUrl}/${endpoint}`, {
      ...init,
      headers: { ...headers, Cookie: cookie.join('; '), ...init.headers }
    });
    if (!res.ok) {
      throw new Error(`${endpoint}: ${res.status} ${await res.text()}`);
    }
    return res.status === 204 ? null : await res.json();
  };
};

const seed = async (mongo: MongoClient) => {
  const api = await createApiClient();

  const form = new FormData();
  for (const file of (await fs.readdir(dicomDir)).sort()) {
    if (!file.startsWith('head-first')) continue;
    const data = await fs.readFile(path.join(dicomDir, file));
    form.append('files', new Blob([data]), file);
  }
  await api('series/domain/default', { method: 'POST', body: form });
  const seriesUid: string = (await api('series')).items[0].seriesUid;

  const projectId: string = (await api('admin/projects')).items[0].projectId;
  const { caseId } = await api('cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      series: [{ seriesUid, partialVolumeDescriptor: 'auto' }],
      tags: []
    })
  });

  // A finished job of a plug-in, which cannot run here without Docker
  const db = mongo.db();
  const now = new Date();
  await db.collection('pluginDefinitions').insertOne({
    pluginId,
    pluginName: 'E2E-MOCK',
    version: '1.0.0',
    type: 'CAD',
    description: 'Mock plug-in for the end-to-end tests',
    runConfiguration: {},
    icon: { glyph: 'brain', color: '#ffffff', backgroundColor: '#666666' },
    displayStrategy: [
      {
        feedbackKey: 'lesionCandidates',
        type: 'LesionCandidates',
        options: {
          feedbackListener: {
            type: 'Choice',
            options: { personal: ['TP', 'FP'], consensual: ['TP', 'FP'] }
          }
        }
      }
    ],
    createdAt: now,
    updatedAt: now
  });
  await db.collection('groups').updateOne(
    { groupName: 'admin' },
    {
      $addToSet: Object.fromEntries(
        [
          'executePlugin',
          'readPlugin',
          'inputPersonalFeedback',
          'inputConsensualFeedback',
          'manageFeedback',
          'manageJobs',
          'viewPersonalInfo'
        ].map(key => [key, pluginId])
      )
    }
  );
  await db.collection('pluginJobs').insertOne({
    jobId,
    pluginId,
    userEmail: 'circus@circus.example.com',
    status: 'finished',
    errorMessage: null,
    series: [
      { seriesUid, partialVolumeDescriptor: { start: 1, end: 10, delta: 1 } }
    ],
    feedbacks: [],
    startedAt: now,
    finishedAt: now,
    // The content of results.json
    results: {
      metadata: { displayOptions: [{ volumeId: 0 }] },
      results: {
        lesionCandidates: [
          {
            rank: 1,
            confidence: 0.9,
            volumeId: 0,
            volumeSize: 100,
            location: [160, 130, 5]
          }
        ]
      }
    },
    createdAt: now,
    updatedAt: now
  });

  return { seriesUid, caseId, jobId };
};

export default async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'circus-e2e-'));
  for (const dir of [
    'labels',
    'dicom',
    'plugin-results',
    'plugin-cache',
    'cs-tmp'
  ]) {
    await fs.mkdir(path.join(dataDir, dir));
  }
  const env = {
    ...process.env,
    CIRCUS_CONFIG: path.join(import.meta.dirname, 'circus.config.mjs'),
    E2E_MONGO_URL: mongoUrl,
    E2E_API_PORT: String(apiPort),
    E2E_DATA_DIR: dataDir
  };

  const mongo = await MongoClient.connect(mongoUrl);
  const children: ChildProcess[] = [];
  const teardown = async () => {
    for (const child of children) child.kill();
    await Promise.all(
      children.map(c => c.exitCode ?? new Promise(r => c.once('exit', r)))
    );
    await mongo.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  };

  try {
    await mongo.db().dropDatabase();
    execFileSync('node', ['circus.ts', 'db', 'migrate'], {
      cwd: apiDir,
      env,
      stdio: 'ignore'
    });

    const webDir = path.join(dataDir, 'web');
    execFileSync(
      'node',
      [vite, 'build', '--outDir', webDir, '--logLevel', 'error'],
      { cwd: webUiDir, stdio: 'inherit' }
    );

    const log = await fs.open(path.join(dataDir, 'api.log'), 'w');
    children.push(
      spawn('node', ['server.ts'], {
        cwd: apiDir,
        env,
        stdio: ['ignore', log.fd, log.fd]
      })
    );
    await log.close(); // The child has its own copy
    children.push(
      spawn(
        'node',
        [
          vite,
          'preview',
          '--outDir',
          webDir,
          '--host',
          '127.0.0.1',
          '--port',
          String(webPort),
          '--strictPort'
        ],
        {
          cwd: webUiDir,
          env: { ...process.env, DEV_PROXY: `http://127.0.0.1:${apiPort}` },
          stdio: 'ignore'
        }
      )
    );
    await waitFor(`${apiUrl}/status`);
    await waitFor(`http://127.0.0.1:${webPort}/`);

    // Inherited by the test workers
    process.env.E2E_SEED = JSON.stringify(await seed(mongo));
  } catch (err) {
    await teardown();
    throw err;
  }
  return teardown;
};
