import pluginJobRunner, {
  fetchSeriesFromRepository,
  executePlugin
} from './pluginJobRunner';
import fs from 'fs-extra';
import path from 'path';
import DockerRunner from '../util/DockerRunner';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import tar from 'tar-stream';
import memory from 'memory-streams';
import * as circus from '../interface';

const testDir = path.resolve(__dirname, '../../test/');
const repositoryDir = path.join(testDir, 'repository/');
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

    // Mock Dicom repository
    const dicomRepository: DicomFileRepository = {
      getSeries: async seriesUid => ({
        save: async (i, data) => {},
        load: async i => {
          const file = '00000001.dcm';
          return (await fs.readFileSync(
            path.join(repositoryDir, seriesUid, file)
          ).buffer) as ArrayBuffer;
        },
        images: '1-5'
      }),
      deleteSeries: async () => {}
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

    const runner = await pluginJobRunner(
      { workingDirectory },
      {
        jobReporter,
        dockerRunner,
        dicomRepository,
        pluginDefinitionAccessor
      }
    );

    const jobRequest: circus.PluginJobRequest = {
      pluginId: 'circus-mock-succeed',
      series: [{ seriesUid }]
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

describe('fetchSeriesFromRepository', () => {
  const dir = path.join(testDir, 'test-fetch');

  test('fetch DICOM data from repository', async () => {
    const repository = ({
      getSeries: jest.fn(uid => {
        return {
          images: '1-5',
          load: () => Promise.resolve('abc')
        };
      })
    } as any) as DicomFileRepository;
    await fetchSeriesFromRepository(repository, 'abc', dir);
    const files = await fs.readdir(dir);
    expect(files).toHaveLength(5);
  });

  afterAll(async () => {
    await fs.remove(dir);
  });
});

describe('executePlugin', () => {
  test('runs docker', async () => {
    const runner = new DockerRunner();
    const plugin: circus.PluginDefinition = {
      pluginId: 'hello-world',
      pluginName: 'Test',
      version: '1.0.0',
      type: 'CAD'
    };
    const { stream, promise } = await executePlugin(
      runner,
      plugin,
      __dirname,
      __dirname
    );
    const memStream = new memory.WritableStream();
    stream.pipe(memStream);
    await promise;
    expect(memStream.toString()).toContain('Hello from Docker!');
  });
});
