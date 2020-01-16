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

  /**
   * Runs the specified container and returns the attached stream.
   * The image will be deleted after the container exits.
   * @param createOptions ContainerCreateOptions passed to Dockerode.
   *   Do not set `AutoRemove` to true.
   * @param timeout Timeout in milliseconds.
   * @returns The returned stream is attached to stdout+stderr.
   *   The returned promise will resolve with the exit code (may be nonzero).
   * @throws DockerTimeoutError if the container did not finish within
   *   the specified timeout period.
   */
  public async runWithStream(
    createOptions: Dockerode.ContainerCreateOptions,
    timeout?: number
  ): Promise<{ stream: NodeJS.ReadableStream; promise: Promise<number> }> {
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
            return state.ExitCode; // resolves without error
          }
        } catch (e) {
          // This happens when the container was accidentally
          // removed from outside this class.
          // Also ensure 'AutoRemove' is not not set to true elsewhere.
          this.emit('disappear', container);
          throw new Error('Container disappeared.');
        }

        if (
          timeout &&
          timeout > 0 &&
          new Date().getTime() - startTime > timeout
        ) {
          try {
            await container.stop({ t: 0 }); // Stops immediately
            await container.remove();
          } catch (e) {}
          this.emit('timeout', state);
          throw new DockerTimeoutError(
            `The container did not finish within the timeout of ${timeout} ms.`
          );
        }
        await this.sleep();
      }
    })() as Promise<number>;

    return { stream, promise };
  }

  /**
   * Runs a docker image and captures the output to stdout as a string.
   * This ignores the exit code. Use `runWithStream` if you need more control.
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

export class DockerTimeoutError extends Error {}

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
