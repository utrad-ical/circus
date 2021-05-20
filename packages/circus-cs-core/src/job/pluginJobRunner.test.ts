import pluginJobRunner, { executePlugin } from './pluginJobRunner';
import path from 'path';
import DockerRunner from '../util/DockerRunner';
import tar, { pack } from 'tar-stream';
import memory from 'memory-streams';
import * as circus from '../interface';
import { EventEmitter } from 'events';

const testDir = path.resolve(__dirname, '../../test/');
const workingDirectory = path.join(testDir, 'working/');

const seriesUid = 'dicom';

describe('pluginJobRunner', () => {
  const jobId = '12345';

  test('Normal run', async () => {
    const dockerRunner = new DockerRunner();

    // Mock Job Reporter
    let resultsPacked = false;
    const jobReporter = {
      report: jest.fn(),
      packDir: (jobId: string, stream: NodeJS.ReadableStream) => {
        return new Promise<void>(resolve => {
          expect(jobId).toBe('12345');
          const extract = tar.extract();
          stream.pipe(extract);
          extract.on('entry', (header: any, fStream: any, next: any) => {
            if (header.name === 'results.json') resultsPacked = true;
            next();
          });
          extract.on('finish', resolve);
        });
      }
    };

    const pluginDefinitionAccessor = {
      get: async (discardPluginId: string) => {
        const fixedDefinition: circus.PluginDefinition = {
          pluginId: 'circus-mock-succeed',
          pluginName: 'Empty',
          version: '1.0',
          type: 'CAD'
        };
        return fixedDefinition;
      }
    } as circus.PluginDefinitionAccessor;

    const dicomVoxelDumper: circus.DicomVoxelDumper = {
      dump: () => {
        const stream = tar.pack();
        stream.entry({ name: '0.mhd' }, '');
        stream.entry({ name: '0.raw' }, Buffer.alloc(10));
        stream.entry({ name: '0.json' }, '{}');
        stream.finalize();
        return { stream, events: new EventEmitter() };
      }
    };

    const runner = await pluginJobRunner(
      { workingDirectory },
      {
        jobReporter,
        dockerRunner,
        pluginDefinitionAccessor,
        dicomVoxelDumper
      }
    );

    const jobRequest: circus.PluginJobRequest = {
      pluginId: 'circus-mock-succeed',
      series: [
        { seriesUid, partialVolumeDescriptor: { start: 1, end: 2, delta: 1 } }
      ]
    };

    const logStream = new memory.WritableStream();

    await runner.run(jobId, jobRequest, logStream);
    expect(jobReporter.report.mock.calls[0][1]).toBe('processing');
    expect(jobReporter.report.mock.calls[1][1]).toBe('results');
    expect(jobReporter.report.mock.calls[2][1]).toBe('finished');
    expect(jobReporter.report).toHaveBeenCalledTimes(3);

    expect(resultsPacked).toBe(true);
    const log = logStream.toString();
    expect(log).toContain('Plug-in execution done.');
  }, 20000);
});

describe('executePlugin', () => {
  const t = async (plugin: circus.PluginDefinition) => {
    const runner = new DockerRunner();
    const { stream, promise } = await executePlugin(
      runner,
      plugin,
      __dirname,
      __dirname
    );
    const memStream = new memory.WritableStream();
    stream.pipe(memStream);
    await promise;
    return memStream.toString();
  };

  test('runs docker', async () => {
    const plugin: circus.PluginDefinition = {
      pluginId: 'hello-world',
      pluginName: 'Test',
      version: '1.0.0',
      type: 'CAD'
    };
    const result = await t(plugin);
    expect(result).toContain('Hello from Docker!');
  });

  // Skipping this test because it's slow, but should work
  test.skip('network blocked', async () => {
    const plugin: circus.PluginDefinition = {
      pluginId: 'circus-mock-check-network',
      pluginName: 'Test',
      version: '1.0.0',
      type: 'CAD'
    };
    const result = await t(plugin);
    expect(result).toContain('EAI_AGAIN'); // Network unavailable
  }, 99999);
});
