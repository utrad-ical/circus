import DockerRunner, { DockerTimeoutError } from './DockerRunner';
import Dockerode from 'dockerode';

if (process.env.SKIP_DOCKER_TESTS) {
  test.skip('skipping docker tests', () => {});
} else {
  let runner: DockerRunner;

  beforeEach(() => (runner = new DockerRunner({})));

  // If this test fails, check if 'hello-world' image is present
  test('run hello-world docker image', async () => {
    const result = await runner.run({ Image: 'hello-world' });
    expect(result).toMatch('Hello from Docker!');
  });

  test('timeout', async () => {
    await expect(
      runner.run({ Image: 'circus-mock-timeout' }, 300)
    ).rejects.toThrow(DockerTimeoutError);
  });

  test('exit code', async () => {
    const { promise } = await runner.runWithStream({
      Image: 'circus-mock-error' // exits with status code 5
    });
    const code = await promise;
    expect(code).toBe(5);
  });

  test('load text file from an image', async () => {
    const result = await runner.loadFromTextFile(
      'circus-mock-succeed',
      '/plugin.json'
    );
    expect(result).toMatch(/pluginName/);
  });

  test('connect to Docker public API', async () => {
    const rode = new Dockerode();
    const results = await rode.listImages();
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
}
