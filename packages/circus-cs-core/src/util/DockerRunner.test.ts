import DockerRunner from './DockerRunner';
import * as Dockerode from 'dockerode';

const dockerOption =
  process.platform === 'win32'
    ? {
        host: 'localhost',
        port: 2375
      }
    : {
        socketPath: '/var/run/docker.sock'
      };

describe('DockerRunner', () => {
  it('should run hello-world docker image', async () => {
    const runner = new DockerRunner(dockerOption);
    const result = await runner.run({ Image: 'hello-world' });
    expect(result).toMatch('Hello from Docker!');
  });

  it('should connect to Docker public API', async () => {
    const rode = new Dockerode(dockerOption);
    const results = await rode.listImages();
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
