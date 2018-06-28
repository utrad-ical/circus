import pluginJobRunner from './pluginJobRunner';
import pluginJobReporter from './pluginJobReporter';
import { PluginJobRequest } from '../interface';
import * as fs from 'fs-extra';
import * as path from 'path';

jest.mock('./pluginJobReporter');

describe('pluginJobRunner', () => {
  afterEach(async () => {
    await fs.remove(path.join(__dirname, 'abcde'));
  });

  test('normal run', async () => {
    const jobReporter = { report: jest.fn() };

    const runner = pluginJobRunner({
      jobReporter,
      tempDir: __dirname
    });

    const job: PluginJobRequest = {
      pluginId: 'lung-cad',
      series: [{ seriesUid: '1.2.3' }]
    };

    await runner.process('abcde', job);
    expect(jobReporter.report).toHaveBeenCalledTimes(2);
  });
});
