import DockerRunner from './DockerRunner';
import * as Dockerode from 'dockerode';

test('run hello-world docker image', async () => {
  const runner = new DockerRunner();
  const result = await runner.run({ Image: 'hello-world' });
  expect(result).toMatch('Hello from Docker!');
});

test('connect to Docker public API', async () => {
  const rode = new Dockerode();
  const results = await rode.listImages();
  expect(results.length).toBeGreaterThanOrEqual(1);
});
