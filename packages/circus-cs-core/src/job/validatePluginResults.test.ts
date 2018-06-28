import validatePluginResults from './validatePluginResults';
import { PluginDefinition } from '../interface';

test('fails if there is not results.json', async () => {
  const plugin: PluginDefinition = {
    pluginId: 'sample',
    version: '1.0.0',
    type: 'CAD',
    dockerImage: 'hello-world'
  };

  await expect(validatePluginResults(plugin, __dirname)).rejects.toThrow(
    'results.json'
  );
});
