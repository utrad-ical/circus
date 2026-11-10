import assert from 'node:assert/strict';
import { describe, test, mock } from 'node:test';
import Archiver from 'archiver';
import { EventEmitter } from 'events';
import memory from 'memory-streams';
import path from 'path';
import type { Readable } from 'stream';
import tar from 'tar-stream';
import type * as circus from '../interface.ts';
import DockerRunner from '../util/DockerRunner.ts';
import pluginJobRunner, { executePlugin } from './pluginJobRunner.ts';

const testDir = path.resolve(import.meta.dirname, '../../test/');
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
    report: mock.fn(),
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
  const statuses = jobReporter.report.mock.calls.map(call => call.arguments[1]);
  assert.deepEqual(statuses, ['processing', 'results', 'finished']);

  assert.equal(resultsPacked, true);
  const log = logStream.toString();
  assert.ok(log.includes('Plug-in execution done.'));
};

describe('pluginJobRunner00', () => {
  test('Normal run', { timeout: 20000 }, async () =>
    generatePluginJobRunnerTest('12345', {
      pluginId: 'circus-mock-succeed',
      pluginName: 'Empty',
      version: '1.0',
      type: 'CAD'
    })
  );

  // Skipping this test because it needs a remote server to be up
  test.skip('Remote CAD run', { timeout: 20000 }, async () =>
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
    })
  );
});

describe('executePlugin', () => {
  const t = async (plugin: circus.PluginDefinition) => {
    const runner = new DockerRunner();
    const { stream, promise } = await executePlugin(
      runner,
      plugin,
      import.meta.dirname,
      import.meta.dirname
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
    assert.ok(result.includes('Hello from Docker!'));
  });

  // Skipping this test because it's slow, but should work
  test.skip('network blocked', { timeout: 99999 }, async () => {
    const plugin: circus.PluginDefinition = {
      pluginId: 'circus-mock-check-network',
      pluginName: 'Test',
      version: '1.0.0',
      type: 'CAD'
    };
    const result = await t(plugin);
    assert.ok(result.includes('EAI_AGAIN')); // Network unavailable
  });
});
