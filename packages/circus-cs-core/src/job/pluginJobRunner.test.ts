import pluginJobRunner, {
  fetchSeriesFromRepository,
  executePlugin
} from './pluginJobRunner';
import fs from 'fs-extra';
import path from 'path';
import DockerRunner from '../util/DockerRunner';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';

const testDir = path.resolve(__dirname, '../../test/');
const repositoryDir = path.join(testDir, 'repository/');
const workingDirectory = path.join(testDir, 'working/');
const resultsDirectory = path.join(testDir, 'results/');

const seriesUid = 'dicom';

describe('pluginJobRunner', () => {
  const jobId = '12345';

  afterEach(async () => {
    await fs.remove(path.join(resultsDirectory, jobId));
  });

  test('Normal run', async () => {
    const jobReporter = { report: jest.fn() };
    const dockerRunner = new DockerRunner();

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
          pluginId: 'circus-mock/empty:1.0',
          pluginName: 'Empty',
          version: '1.0',
          type: 'CAD'
        };
        return fixedDefinition;
      }
    };

    const runner = await pluginJobRunner(
      {
        workingDirectory,
        resultsDirectory
      },
      {
        jobReporter,
        dockerRunner,
        dicomRepository,
        pluginDefinitionAccessor
      }
    );

    const jobRequest: circus.PluginJobRequest = {
      pluginId: 'circus-mock/empty:1.0',
      series: [{ seriesUid }]
    };

    await runner.run(jobId, jobRequest);
    expect(jobReporter.report).toHaveBeenCalledTimes(3);
    expect(jobReporter.report.mock.calls[0][1]).toBe('processing');
    expect(jobReporter.report.mock.calls[1][1]).toBe('results');
    expect(jobReporter.report.mock.calls[2][1]).toBe('finished');
  });
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
    const result = await executePlugin(runner, plugin, __dirname, __dirname);
    expect(result).toContain('Hello from Docker!');
  });
});
