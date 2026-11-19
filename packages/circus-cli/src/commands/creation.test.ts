import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { Command } from 'commander';
import type { AuthorizedFetch } from '../utils/createAuthorizedFetch.ts';
import caseCreateArgs from './case-create.args.ts';
import caseCreate from './case-create.ts';
import jobCreateArgs from './job-create.args.ts';
import jobCreate from './job-create.ts';

const user = {
  accessibleProjects: [
    {
      projectId: 'study-a',
      project: { projectName: 'Study A' },
      roles: ['write']
    },
    {
      projectId: 'read-only',
      project: { projectName: 'Study A' },
      roles: ['read']
    }
  ],
  accessiblePlugins: [
    {
      pluginId: 'lung-v1',
      plugin: { pluginName: 'Lung CAD', version: '1.0.0' },
      roles: ['executePlugin']
    },
    {
      pluginId: 'lung-v2',
      plugin: { pluginName: 'Lung CAD', version: '2.0.0' },
      roles: ['executePlugin']
    },
    {
      pluginId: 'read-only',
      plugin: { pluginName: 'Lung CAD', version: '3.0.0' },
      roles: ['readPlugin']
    }
  ]
};

const setup = (t: TestContext, jobError?: Error) => {
  const log = t.mock.method(console, 'log', () => {});
  const requests: string[] = [];
  const posts: { resource: string; body: unknown }[] = [];
  const fetch: AuthorizedFetch = async (resource, init) => {
    requests.push(resource);
    if (resource === 'login-info/full') return Response.json(user);
    if (resource.startsWith('series/')) {
      return Response.json({ images: '4-10,20-22' });
    }
    assert.ok(resource === 'cases' || resource === 'plugin-jobs');
    assert.equal(init?.method, 'POST');
    assert.ok(typeof init.body === 'string');
    posts.push({ resource, body: JSON.parse(init.body) });
    if (resource === 'plugin-jobs' && jobError) throw jobError;
    return Response.json(
      resource === 'cases' ? { caseId: 'new-case' } : { jobId: 'new-job' },
      { status: 201 }
    );
  };

  const program = new Command();
  const deps = { getFetch: () => fetch, rcFilePath: '' };
  caseCreateArgs(program).action(caseCreate(deps));
  jobCreateArgs(program).action(jobCreate(deps));
  const run = (...args: string[]) => program.parseAsync(args, { from: 'user' });
  return { log, requests, posts, run };
};

test('creates a case with tags and explicit and automatic series ranges', async t => {
  const { log, posts, run } = setup(t);
  await run(
    'case-create',
    '--project',
    'Study A',
    '--tags',
    'baseline, follow-up',
    '1.2.3:4:10:2',
    '1.2.4'
  );

  assert.deepEqual(posts, [
    {
      resource: 'cases',
      body: {
        projectId: 'study-a',
        tags: ['baseline', 'follow-up'],
        series: [
          {
            seriesUid: '1.2.3',
            partialVolumeDescriptor: { start: 4, end: 10, delta: 2 }
          },
          {
            seriesUid: '1.2.4',
            partialVolumeDescriptor: 'auto'
          }
        ]
      }
    }
  ]);
  assert.deepEqual(
    log.mock.calls.map(call => call.arguments),
    [['new-case']]
  );
});

test('registers a job with priority zero and automatic and explicit series ranges', async t => {
  const { log, posts, run } = setup(t);
  await run(
    'job-create',
    '--plugin',
    'lung-v2',
    '--priority',
    '0',
    '1.2.3',
    '1.2.4:10:4:-2'
  );

  assert.deepEqual(posts, [
    {
      resource: 'plugin-jobs',
      body: {
        pluginId: 'lung-v2',
        priority: 0,
        series: [
          {
            seriesUid: '1.2.3',
            partialVolumeDescriptor: 'auto'
          },
          {
            seriesUid: '1.2.4',
            partialVolumeDescriptor: { start: 10, end: 4, delta: -2 }
          }
        ]
      }
    }
  ]);
  assert.deepEqual(
    log.mock.calls.map(call => call.arguments),
    [['new-job']]
  );
});

test('reports a duplicate job without retrying when all arguments are supplied', async t => {
  const duplicate = Object.assign(new Error('HTTP error: 400 Bad Request'), {
    status: 400,
    body: JSON.stringify({
      error: 'There is a duplicate job that is already registered.'
    })
  });
  const { posts, run } = setup(t, duplicate);

  await assert.rejects(run('job-create', '--plugin', 'lung-v2', '1.2.3'), {
    message: duplicate.message
  });
  assert.deepEqual(posts, [
    {
      resource: 'plugin-jobs',
      body: {
        pluginId: 'lung-v2',
        series: [{ seriesUid: '1.2.3', partialVolumeDescriptor: 'auto' }]
      }
    }
  ]);
});

test('lists executable plug-in IDs when the supplied name is ambiguous', async t => {
  const { requests, run } = setup(t);
  await assert.rejects(run('job-create', '--plugin', 'Lung CAD', '1.2.3'), {
    message:
      "Multiple plug-ins match 'Lung CAD'. Use --plugin with one of these IDs.\n  lung-v1\n  lung-v2"
  });
  assert.deepEqual(requests, ['login-info/full']);
});

test('rejects malformed series arguments before fetching or prompting', async t => {
  const { requests, run } = setup(t);
  await assert.rejects(run('case-create', 'ああああ'), /Invalid Series UID/);
  await assert.rejects(run('case-create', '1.2.3:4'), /Invalid series/);
  await assert.rejects(run('job-create', '1.2.3:4:10:step'), /Invalid series/);
  assert.deepEqual(requests, []);
});
