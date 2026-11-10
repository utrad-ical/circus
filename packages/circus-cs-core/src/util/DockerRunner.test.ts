import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import DockerRunner, { DockerTimeoutError } from './DockerRunner.ts';
import Dockerode from 'dockerode';

if (process.env.SKIP_DOCKER_TESTS) {
  test.skip('skipping docker tests', () => {});
} else {
  let runner: DockerRunner;

  beforeEach(() => (runner = new DockerRunner()));

  // If this test fails, check if 'hello-world' image is present
  test('run hello-world docker image', async () => {
    const result = await runner.run({ Image: 'hello-world' });
    assert.ok(result.includes('Hello from Docker!'));
  });

  test('timeout', async () => {
    await assert.rejects(
      runner.run({ Image: 'circus-mock-timeout' }, 300),
      DockerTimeoutError
    );
  });

  test('exit code', async () => {
    const { promise } = await runner.runWithStream({
      Image: 'circus-mock-error' // exits with status code 5
    });
    const code = await promise;
    assert.equal(code, 5);
  });

  test('load text file from an image', async () => {
    const result = await runner.loadFromTextFile(
      'circus-mock-succeed',
      '/plugin.json'
    );
    assert.match(result, /pluginName/);
  });

  test('connect to Docker public API', async () => {
    const rode = new Dockerode();
    const results = await rode.listImages();
    assert.ok(results.length >= 1);
  });
}
