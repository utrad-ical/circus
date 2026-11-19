import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { commandDeps, runCommand } from '../test/command.ts';
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

const setup = (
  t: TestContext,
  jobError?: Error,
  overrides: Parameters<typeof commandDeps>[0] = {}
) => {
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
    const body = JSON.parse(init.body);
    posts.push({ resource, body });
    if (resource === 'plugin-jobs' && jobError && !body.force) {
      throw jobError;
    }
    return Response.json(
      resource === 'cases' ? { caseId: 'new-case' } : { jobId: 'new-job' },
      { status: 201 }
    );
  };

  const deps = commandDeps({ getFetch: () => fetch, ...overrides });
  const run = (group: 'case' | 'job', ...args: string[]) =>
    group === 'case'
      ? runCommand(group, caseCreateArgs, caseCreate, args, deps)
      : runCommand(group, jobCreateArgs, jobCreate, args, deps);
  return { log, requests, posts, run };
};

test('creates a case with tags and explicit and automatic series ranges', async t => {
  const { log, posts, run } = setup(t);
  await run(
    'case',
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
    'job',
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

const duplicateJob = Object.assign(new Error('HTTP error: 400 Bad Request'), {
  status: 400,
  body: JSON.stringify({
    error: 'There is a duplicate job that is already registered.'
  })
});

test('reports a duplicate job without retrying when all arguments are supplied', async t => {
  const { posts, run } = setup(t, duplicateJob);

  await assert.rejects(run('job', '--plugin', 'lung-v2', '1.2.3'), {
    message: duplicateJob.message
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
  await assert.rejects(run('job', '--plugin', 'Lung CAD', '1.2.3'), {
    message:
      "Multiple plug-ins match 'Lung CAD'. Use --plugin with one of these IDs.\n  lung-v1\n  lung-v2"
  });
  assert.deepEqual(requests, ['login-info/full']);
});

test('rejects malformed series arguments before fetching or prompting', async t => {
  const { requests, run } = setup(t);
  await assert.rejects(run('case', 'ああああ'), /Invalid Series UID/);
  await assert.rejects(run('case', '1.2.3:4'), /Invalid series/);
  await assert.rejects(run('job', '1.2.3:4:10:step'), /Invalid series/);
  assert.deepEqual(requests, []);
});

test('asks for an image range before submitting an interactively selected series', async t => {
  const prompts = ['1.2.3', '10:4:-2'];
  const { posts, run } = setup(t, undefined, {
    isInputTTY: true,
    prompts: {
      input: async ({ message, validate }) => {
        const answer = prompts.shift();
        assert.ok(answer);
        assert.match(
          message,
          answer === '1.2.3' ? /Series UID/ : /Image range/
        );
        assert.ok(validate);
        assert.equal(await validate(answer), true);
        return answer;
      },
      select: async ({ default: selection }) => {
        assert.equal(selection, 'submit');
        return selection;
      }
    }
  });

  await run('case', '--project', 'study-a');

  assert.deepEqual(prompts, []);
  assert.deepEqual(posts, [
    {
      resource: 'cases',
      body: {
        projectId: 'study-a',
        series: [
          {
            seriesUid: '1.2.3',
            partialVolumeDescriptor: { start: 10, end: 4, delta: -2 }
          }
        ]
      }
    }
  ]);
});

for (const confirmed of [false, true]) {
  test(
    confirmed
      ? 'retries a duplicate job once after confirmation'
      : 'cancels an interactive duplicate job by default',
    async t => {
      const answers = ['1.2.3', 'auto'];
      const confirm = t.mock.fn(async (options: { default?: boolean }) => {
        assert.equal(options.default, false);
        return confirmed;
      });
      const { log, posts, run } = setup(t, duplicateJob, {
        isInputTTY: true,
        prompts: {
          input: async ({ default: defaultAnswer, validate }) => {
            const answer = answers.shift();
            assert.ok(answer);
            if (answer === 'auto') assert.equal(defaultAnswer, 'auto');
            assert.ok(validate);
            assert.equal(await validate(answer), true);
            return answer;
          },
          select: async ({ default: selection }) => {
            assert.equal(selection, 'submit');
            return selection;
          },
          confirm
        }
      });

      await run('job', '--plugin', 'lung-v2');

      assert.deepEqual(answers, []);
      assert.equal(confirm.mock.callCount(), 1);
      const request = {
        pluginId: 'lung-v2',
        series: [{ seriesUid: '1.2.3', partialVolumeDescriptor: 'auto' }]
      };
      assert.deepEqual(
        posts.map(({ body }) => body),
        [request, ...(confirmed ? [{ ...request, force: true }] : [])]
      );
      assert.equal(
        log.mock.calls.at(-1)?.arguments[0],
        confirmed ? 'new-job' : 'Canceled.'
      );
    }
  );
}
