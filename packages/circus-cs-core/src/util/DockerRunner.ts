import { EventEmitter } from 'events';
import Dockerode from 'dockerode';
import memory from 'memory-streams';
import sleep from './sleep';
import tar from 'tar-stream';
import path from 'path';
import os from 'os';
import defaults from '../config/default';

// Supported events:
// - container
// - attached
// - started
// - inspected
// - disappeared
// - exited
// - timeouted
// - (statechange may be supported ...?)

const defaultDockerOption = defaults.dockerRunner.options;

// Used to run containers as the current user
const userOptions =
  process.platform === 'win32'
    ? {}
    : {
        User: `${os.userInfo().uid}:${os.userInfo().gid}`
      };

/**
 * Dockerode wrapper.
 */
export default class DockerRunner extends EventEmitter {
  private dockerOptions: Dockerode.DockerOptions;

  private watchInterval: number;

  constructor(options: Dockerode.DockerOptions = defaultDockerOption) {
    super();
    this.dockerOptions = options;
    this.watchInterval = 500;
  }

  public async runWithStream(
    createOptions: Dockerode.ContainerCreateOptions,
    timeout?: number
  ): Promise<{ stream: NodeJS.ReadableStream; promise: Promise<void> }> {
    const docker = new Dockerode(this.dockerOptions);

    const container = await docker.createContainer({
      ...createOptions,
      ...userOptions
    });
    this.emit('container', container);

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    await container.start();
    this.emit('start', container);
    const startTime: number = Number(new Date().getTime());

    const promise = (async () => {
      while (1) {
        let state;
        try {
          const state = (await container.inspect()).State;
          this.emit('inspect', state);
          if (state.Status === 'exited') {
            this.emit('exit', state);
            await container.remove();
            this.emit('remove', container);
            break; // resolves without error
          }
        } catch (e) {
          // This happens when the container was accidentally
          // removed from outside this class.
          // Also ensure 'AutoRemove' is not not set to true.
          this.emit('disappear', container);
          throw new Error('Container disappeared.');
        }

        if (
          timeout &&
          timeout > 0 &&
          new Date().getTime() > startTime + timeout
        ) {
          this.emit('timeout', state);
          try {
            await container.stop();
            await container.remove();
          } catch (e) {}
          throw new DockerTimeoutError('Timeout happened.');
        }
        await this.sleep();
      }
    })();

    return { stream, promise };
  }

  /**
   * Runs a docker image and returns its output to stdout as a string.
   */
  public async run(
    createOptions: Dockerode.ContainerCreateOptions,
    timeout?: number
  ): Promise<string> {
    const { stream, promise } = await this.runWithStream(
      createOptions,
      timeout
    );
    const memStream = new memory.WritableStream();
    stream.pipe(memStream);
    await promise;
    return memStream.toString();
  }

  /**
   * Creates a temporary container and loads a text file from the container.
   * @param image The docker image.
   * @param path The path of the target file within the image.
   */
  public async loadFromTextFile(
    image: string,
    target: string
  ): Promise<string | undefined> {
    const docker = new Dockerode(this.dockerOptions);
    const container = await docker.createContainer({ Image: image });
    try {
      const tarArchiveStream = await container.getArchive({ path: target });
      const extractedFiles = await extractFromTar(tarArchiveStream);
      const file = extractedFiles.find(e => e.name === path.basename(target));
      if (file) return file.data.toString('utf8');
      return undefined;
    } finally {
      await container.remove();
    }
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

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const bufs: any[] = [];
  return new Promise(resolve => {
    stream.on('data', d => bufs.push(d));
    stream.on('end', () => {
      resolve(Buffer.concat(bufs));
    });
  });
}

interface TarEntry {
  name: string;
  data: Buffer;
}

function extractFromTar(archive: NodeJS.ReadableStream): Promise<TarEntry[]> {
  return new Promise(resolve => {
    const results: TarEntry[] = [];
    const extract = tar.extract();
    extract.on(
      'entry',
      async (header: any, stream: NodeJS.ReadableStream, next: Function) => {
        results.push({ name: header.name, data: await streamToBuffer(stream) });
        next();
      }
    );
    extract.on('finish', () => resolve(results));
    archive.pipe(extract);
  });
}
