import { test, before, beforeEach, mock } from 'node:test';
import { expect } from 'expect';
import { setUpMongoFixture, usingModels } from '../test/util-mongo.ts';
import type { CommandFunc } from './Command.ts';
import inquirer from 'inquirer';
import { command } from './register-cad-plugin.ts';

const modelsPromise = usingModels();
let commandFunc: CommandFunc;

// always say yes to the 'is this okay' prompt
mock.method(inquirer, 'prompt', async () => ({ ok: true }));

let pluginDefFileContent: object;

before(async () => {
  const { database, validator, models } = await modelsPromise;
  const dockerRunner = {
    // mocked DockerRunner
    loadFromTextFile: async () => JSON.stringify(pluginDefFileContent)
  } as any;
  commandFunc = await command(null, {
    database,
    validator,
    models,
    dockerRunner
  });
});

beforeEach(async () => {
  const { db } = (await modelsPromise).database;
  await setUpMongoFixture(db, ['pluginDefinitions']);
});

const pluginId =
  '144a480286e9b76f9ced60245930f8dc484b27ee58c2da2bc242bbd911fcff12'; // dummy

test('registers a CAD plug-in', async () => {
  pluginDefFileContent = {
    type: 'CAD',
    pluginName: 'my awesome cad',
    version: '1.5.0',
    description: 'detects everything'
  };
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({ _args: [pluginId] });
  expect(spy.mock.calls.map(c => c.arguments)).toContainEqual([
    'Registered my awesome cad v1.5.0'
  ]);

  const { models } = await modelsPromise;
  const data = await models.plugin.findById(pluginId);
  expect(data).toMatchObject({ pluginId, version: '1.5.0' });

  // Prevents installation of the same plug-in
  await expect(commandFunc({ _args: [pluginId] })).rejects.toThrow(
    /already installed/
  );
});

test('rejects a broken CAD definition file', async () => {
  pluginDefFileContent = {
    pluginName: 'my awesome cad',
    version: '1.4.x.y',
    description: 'detects everything'
  };
  await expect(commandFunc({ _args: [pluginId] })).rejects.toThrow(
    /validation failed/
  );
});
