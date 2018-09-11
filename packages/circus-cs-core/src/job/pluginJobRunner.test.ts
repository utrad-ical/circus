import pluginJobRunner, {
  fetchSeriesFromRepository,
  buildDicomVolume,
  executePlugin
} from './pluginJobRunner';
import { PluginJobRequest, PluginDefinition } from '../interface';
import fs from 'fs-extra';
import path from 'path';
import DockerRunner from '../util/DockerRunner';
import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import {setInfoDir, setPluginDefinitions} from '../util/info';

const testDir = path.resolve(__dirname, '../../test/');
const repositoryDir = path.join(testDir, 'repository/');
const workingDirectory = path.join(testDir, 'working/');
const resultsDirectory = path.join(testDir, 'results/');
const infoDirectory = path.join(testDir, 'info/');

const seriesUid = 'dicom';

describe('pluginJobRunner', () => {
  const jobId = '12345';

  beforeAll(async () => {
    setInfoDir(infoDirectory);
  });

  afterEach(async () => {
    await fs.remove(path.join(resultsDirectory, jobId));
  });

  afterAll(async () => {
    await fs.remove(infoDirectory);
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
      })
    };
    const pluginList: PluginDefinition[] = [
      {
        pluginId: 'hello',
        pluginName: 'hello',
        version: '1.0',
        dockerImage: 'hello-world',
        type: 'CAD'
      }
    ];

    setPluginDefinitions(pluginList);

    const runner = pluginJobRunner({
      jobReporter,
      dockerRunner,
      dicomRepository,
      workingDirectory,
      resultsDirectory
    });

    const jobRequest: PluginJobRequest = {
      pluginId: 'hello',
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
  const dir = path.join(__dirname, 'test-fetch');

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

describe('buildDicomVolume', () => {
  // If this test fails, double-check 'dicom_voxel_dump' image
  // has been correctly loaded in the Docker environment.
  test('craetes raw volume file', async () => {
    const srcDir = path.join(repositoryDir, seriesUid);
    const tmpDestDir = path.resolve(__dirname, '../../test/dicom-out');
    await fs.emptyDir(tmpDestDir);
    try {
      const runner = new DockerRunner();
      await buildDicomVolume(runner, srcDir, tmpDestDir);
      const files = await fs.readdir(tmpDestDir);
      expect(files).toContain('0.mhd');
      expect(files).toContain('0.raw');
      expect(files).toContain('0.txt');
    } finally {
      await fs.remove(tmpDestDir);
    }
  });
});

describe('executePlugin', () => {
  test('runs docker', async () => {
    const runner = new DockerRunner();
    const plugin: PluginDefinition = {
      pluginId: 'Test',
      pluginName: 'Test',
      version: '1.0.0',
      type: 'CAD',
      dockerImage: 'hello-world'
    };
    const result = await executePlugin(runner, plugin, __dirname, __dirname);
    expect(result).toContain('Hello from Docker!');
  });
});
