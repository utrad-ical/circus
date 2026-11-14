import * as cp from 'node:child_process';

/**
 * Promise-based exec.
 * @param command - command to execute
 * @param stdin - passed to stdin of the child process
 * @param env - passed to options.env
 * @returns captured stdout of the child process
 */
const exec = async (
  command: string,
  stdin?: string,
  env: typeof process.env = process.env
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const child = cp.exec(command, { env }, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    );
    if (stdin) child.stdin!.end(stdin);
  });
};

export default exec;
