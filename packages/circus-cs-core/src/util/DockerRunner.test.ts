import DockerRunner from './DockerRunner';
import Dockerode from 'dockerode';

test('run hello-world docker image', async () => {
  const runner = new DockerRunner();
  const result = await runner.run({ Image: 'hello-world' });
  expect(result).toMatch('Hello from Docker!');
});

test('load text file from an image', async () => {
  const runner = new DockerRunner();
  const result = await runner.loadFromTextFile(
    'circus-mock/succeeds:1.0',
    '/etc/os-release'
  );
  expect(result).toMatch(/Alpine Linux/);
});

test('connect to Docker public API', async () => {
  const rode = new Dockerode();
  const results = await rode.listImages();
  expect(results.length).toBeGreaterThanOrEqual(1);
});
