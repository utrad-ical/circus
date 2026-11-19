import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandDeps, runCommand } from '../test/command.ts';
import showArgs from './mylist-show.args.ts';
import show from './mylist-show.ts';

for (const empty of [false, true]) {
  test(
    empty
      ? 'reports an empty mylist collection'
      : 'displays the list name and ID',
    async t => {
      const log = t.mock.method(console, 'log', () => {});
      const deps = commandDeps({
        getFetch: () => async resource => {
          assert.equal(resource, 'mylists');
          return Response.json(
            empty
              ? []
              : [
                  {
                    resourceType: 'case',
                    myListId: 'fixture-list',
                    name: 'Examples',
                    createdAt: '2026-11-19T00:00:00.000Z'
                  }
                ]
          );
        }
      });

      await runCommand('mylist', showArgs, show, [], deps);

      const output = log.mock.calls.at(-1)?.arguments[0];
      assert.equal(typeof output, 'string');
      if (empty) {
        assert.equal(output, 'This user has no my list yet.');
      } else {
        assert.match(output, /fixture-list\s+Examples/);
      }
    }
  );
}
