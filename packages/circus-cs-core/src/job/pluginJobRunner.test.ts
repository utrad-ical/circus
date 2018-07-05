import pluginJobRunner, {
  fetchSeriesFromRepository,
  buildDicomVolume,
  executePlugin
} from './pluginJobRunner';
import { PluginJobRequest, PluginDefinition } from '../interface';
import * as fs from 'fs-extra';
import * as path from 'path';
import MockDicomFileRepository from '../dicom-file-repository/MockDicomFileRepository';
import DockerRunner from '../util/DockerRunner';
import StaticDicomFileRepository from '../dicom-file-repository/StaticDicomFileRepository';

const seriesUid = 'dicom';

describe('pluginJobRunner', () => {
  afterEach(async () => {
    await fs.remove(path.join(__dirname, 'abcde'));
  });

  test.skip('Normal run', async () => {
    const jobReporter = { report: jest.fn() };
    const dockerRunner = new DockerRunner();
    const testDir = path.resolve(__dirname, '../../test');
    const dicomRepository = new StaticDicomFileRepository({ dataDir: 'poe' });
    const pluginList: PluginDefinition[] = [
      {
        pluginId: 'hello',
        version: '1.0',
        dockerImage: 'hello-world',
        type: 'CAD'
      }
    ];

    const runner = pluginJobRunner({
      jobReporter,
      dockerRunner,
      dicomRepository,
      pluginList,
      workingDirectory: __dirname,
      resultsDirectory: path.join(__dirname, 'test-results')
    });

    const job: PluginJobRequest = {
      pluginId: 'hello-world',
      series: [{ seriesUid }]
    };

    await runner.run('abcde', job);
    expect(jobReporter.report).toHaveBeenCalledTimes(2);
    expect(jobReporter.report.mock.calls[1][1]).toBe('finished');
  });
});

describe('fetchSeriesFromRepository', () => {
  const dir = path.join(__dirname, 'test-fetch');

  test('fetch DICOM data from repository', async () => {
    const repository = new MockDicomFileRepository({});
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
    const srcDir = path.resolve(__dirname, '../../test/', seriesUid);
    const destDir = path.resolve(__dirname, '../../test/dicom-out');
    await fs.emptyDir(destDir);
    try {
      const runner = new DockerRunner();
      await buildDicomVolume(runner, srcDir, destDir);
      const files = await fs.readdir(destDir);
      expect(files).toContain('0.mhd');
      expect(files).toContain('0.raw');
      expect(files).toContain('0.txt');
    } finally {
      await fs.remove(destDir);
    }
  });
});

describe('executePlugin', () => {
  test('runs docker', async () => {
    const runner = new DockerRunner();
    const plugin: PluginDefinition = {
      pluginId: 'Test',
      version: '1.0.0',
      type: 'CAD',
      dockerImage: 'hello-world'
    };
    const result = await executePlugin(runner, plugin, __dirname, __dirname);
    expect(result).toContain('Hello from Docker!');
  });
});
