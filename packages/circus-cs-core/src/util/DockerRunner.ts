import { EventEmitter } from 'events';
import * as Dockerode from 'dockerode';
import * as memory from 'memory-streams';
import sleep from './sleep';

// Supported events:
// - container
// - attached
// - started
// - inspected
// - disappeared
// - exited
// - timeouted
// - (statechange may be supported ...?)

const defaultDockerOption =
  process.platform === 'win32'
    ? {
        host: 'localhost',
        port: 2375
      }
    : {
        socketPath: '/var/run/docker.sock'
      };

/**
 * Dockerode wrapper.
 */
export default class DockerRunner extends EventEmitter {
  private dockerOptions: Dockerode.DockerOptions;

  private watchInterval: number;
  private timeout: number | null;

  constructor(options: Dockerode.DockerOptions = defaultDockerOption) {
    super();
    this.dockerOptions = options;
    this.watchInterval = 500;
    this.timeout = null;
  }

  public setTimeout(millSeconds: number) {
    this.timeout = millSeconds;
  }

  public async run(
    createOptions: Dockerode.ContainerCreateOptions
  ): Promise<string> {
    const docker = new Dockerode(this.dockerOptions);

    const container = await docker.createContainer(createOptions);
    this.emit('container', container);

    const stdoutInContainer = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });
    const stream = new memory.WritableStream();
    stdoutInContainer.pipe(stream);
    this.emit('attached', stdoutInContainer);

    container.start().then(() => {
      this.emit('started', container);
    });

    const startTime: number = Number(new Date().getTime());
    while (1) {
      let state;
      try {
        state = (await container.inspect()).State;
        this.emit('inspected', state);

        if (state.Status === 'exited') {
          this.emit('exited', state);

          await container.remove();
          this.emit('removed', container);

          break;
        }
      } catch (e) {
        this.emit('disappeared', container);
        break;
      }

      // Check timeout
      if (
        this.timeout !== null &&
        new Date().getTime() > startTime + this.timeout
      ) {
        this.emit('timeouted', state);

        try {
          await container.stop();
        } catch (e) {}

        try {
          await container.remove();
        } catch (e) {}

        throw new DockerTimeoutError(stream.toString());
      }

      await this.sleep();
    }

    return stream.toString();
  }

  sleep(millSeconds: number = this.watchInterval) {
    return sleep(millSeconds);
  }
}

export class DockerTimeoutError extends Error {
  public code: string;
  public previous: any;

  constructor(message: string, code: string = '', previous?: any) {
    super(message);
    this.message = message;
    this.code = code;
    this.previous = previous;
  }

  public toString() {
    return this.message;
  }
}
