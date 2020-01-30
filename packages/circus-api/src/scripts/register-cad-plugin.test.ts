import { setUpMongoFixture, usingModels } from '../../test/util-mongo';
import { CommandFunc } from './Command';
import { command } from './register-cad-plugin';

const modelsPromise = usingModels();
let commandFunc: CommandFunc;

jest.mock('inquirer', () => {
  return {
    // always say yes to the 'is this okay' prompt
    prompt: jest.fn().mockReturnValue({ ok: true })
  };
});

let pluginDefFileContent: object;

beforeAll(async () => {
  const { db, validator, models } = await modelsPromise;
  const dockerRunner = {
    // mocked DockerRunner
    loadFromTextFile: async () => JSON.stringify(pluginDefFileContent)
  } as any;
  commandFunc = await command(null, { db, validator, models, dockerRunner });
});

beforeEach(async () => {
  const { db } = await modelsPromise;
  await setUpMongoFixture(db, ['pluginDefinitions']);
});

const pluginId =
  '144a480286e9b76f9ced60245930f8dc484b27ee58c2da2bc242bbd911fcff12'; // dummy

test('registers a CAD plug-in', async () => {
  pluginDefFileContent = {
    pluginName: 'my awesome cad',
    version: '1.5.0',
    description: 'detects everything'
  };
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({ _args: [pluginId] });
  expect(spy).toHaveBeenCalledWith('Registered my awesome cad v1.5.0');

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
