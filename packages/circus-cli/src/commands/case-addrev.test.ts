import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { commandDeps, runCommand, tempDirectory } from '../test/command.ts';
import addrevArgs from './case-addrev.args.ts';
import addrev from './case-addrev.ts';

test('rejects input files without case IDs before creating the API client', async t => {
  const list = join(await tempDirectory(t), 'case-ids.txt');
  await writeFile(list, '\n  # No case IDs\n\n');

  await assert.rejects(
    runCommand('case', addrevArgs, addrev, ['--file', list], commandDeps()),
    /No case IDs found in the input files/
  );
});

for (const confirmed of [false, true]) {
  test(
    confirmed
      ? 'posts the filtered revision after confirmation'
      : 'cancels revision creation before posting',
    async t => {
      t.mock.method(console, 'log', () => {});
      const filter = join(await tempDirectory(t), 'filter.mjs');
      await writeFile(
        filter,
        `
      import assert from 'node:assert/strict';
      import { text } from 'node:stream/consumers';
      const revision = JSON.parse(await text(process.stdin));
      assert.equal(revision.description, 'Original revision');
      assert.equal(process.env.CIRCUS_CASE_ID, 'test-case');
      revision.attributes = { score: 2 };
      process.stdout.write(JSON.stringify(revision));
    `
      );
      const submitted: unknown[] = [];
      const deps = commandDeps({
        prompts: {
          confirm: async ({ default: answer }) => {
            assert.equal(answer, false);
            return confirmed;
          }
        },
        getFetch: () => async (resource, init) => {
          if (resource === 'cases/test-case') {
            return Response.json({
              revisions: [
                {
                  creator: 'fixture@example.test',
                  date: '2026-11-19T00:00:00.000Z',
                  series: [],
                  status: 'draft',
                  description: 'Original revision',
                  attributes: { score: 1 }
                }
              ]
            });
          }
          assert.equal(resource, 'cases/test-case/revision');
          assert.equal(init?.method, 'POST');
          assert.equal(typeof init?.body, 'string');
          submitted.push(JSON.parse(init?.body as string));
          return new Response(null, { status: 201 });
        }
      });

      await runCommand(
        'case',
        addrevArgs,
        addrev,
        [
          '--exec',
          `"${process.execPath}" "${filter}"`,
          '--desc',
          'Updated revision',
          'test-case'
        ],
        deps
      );

      assert.deepEqual(
        submitted,
        confirmed
          ? [
              {
                series: [],
                attributes: { score: 2 },
                status: 'draft',
                description: 'Updated revision'
              }
            ]
          : []
      );
    }
  );
}
