import Archiver from 'archiver';
import { EventEmitter } from 'events';
import memory from 'memory-streams';
import path from 'path';
import { Readable } from 'stream';
import tar from 'tar-stream';
import * as circus from '../interface';
import DockerRunner from '../util/DockerRunner';
import pluginJobRunner, { executePlugin } from './pluginJobRunner';

const testDir = path.resolve(__dirname, '../../test/');
const workingDirectory = path.join(testDir, 'working/');

const seriesUid = 'dicom';

const generatePluginJobRunnerTest = async (
  jobId: string,
  pluginDefinition: circus.PluginDefinition
) => {
  const dockerRunner = new DockerRunner();
  const logStream = new memory.WritableStream();

  // Mock Job Reporter
  let resultsPacked = false;
  const jobReporter = {
    report: jest.fn(),
    logStream: async (jobId: string, stream: Readable) => {
      stream.pipe(logStream);
    },
    packDir: (jobId: string, stream: Readable) => {
      return new Promise<void>(resolve => {
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
      const fixedDefinition: circus.PluginDefinition = pluginDefinition;
      return fixedDefinition;
    }
  } as circus.PluginDefinitionAccessor;

  const dicomVoxelDumper: circus.DicomVoxelDumper = {
    dump: () => {
      const stream = Archiver('tar');
      stream.append('', { name: '0.mhd' });
      stream.append(Buffer.alloc(10), { name: '0.raw' });
      stream.append('{}', { name: '0.json' });
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

  await runner.run(jobId, jobRequest);
  const statuses = jobReporter.report.mock.calls.map(call => call[1]);
  expect(statuses).toEqual(['processing', 'results', 'finished']);

  expect(resultsPacked).toBe(true);
  const log = logStream.toString();
  expect(log).toContain('Plug-in execution done.');
};

describe('pluginJobRunner00', () => {
  test(
    'Normal run',
    async () =>
      generatePluginJobRunnerTest('12345', {
        pluginId: 'circus-mock-succeed',
        pluginName: 'Empty',
        version: '1.0',
        type: 'CAD'
      }),
    20000
  );

  // Skipping this test because it needs a remote server to be up
  test.skip(
    'Remote CAD run',
    async () =>
      generatePluginJobRunnerTest('54321', {
        pluginId: 'circus-remote-mock',
        pluginName: 'RemoteTest',
        version: '1.0',
        type: 'CAD+remote',
        runConfiguration: {
          adapter: 'defaultHttpAdapter',
          parameters: {
            endpoint: 'http://localhost:7743',
            authentication: 'dummy-secret-token',
            maxConcurrency: 1,
            timeout: 300,
            env: []
          }
        }
      }),
    20000
  );
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
