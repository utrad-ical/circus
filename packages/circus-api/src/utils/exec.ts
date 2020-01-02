import * as cp from 'child_process';

/**
 * Executes a command as a child process and gets the output.
 */
const exec = (
  command: string,
  args: string[],
  stopOnStderr: boolean = false
) => {
  return new Promise<string>((resolve, reject) => {
    cp.execFile(command, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else if (stopOnStderr && stderr) reject(stderr);
      else resolve(stdout);
    });
  });
};

export default exec;
