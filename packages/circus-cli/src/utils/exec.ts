import * as cp from 'node:child_process';

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
