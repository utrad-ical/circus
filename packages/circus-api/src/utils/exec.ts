import * as cp from 'child_process';

/**
 * Promisified cp.exec
 */
export const pExec = (
  file: string,
  args: string[],
  options: cp.ExecFileOptions & { encoding?: string | null } = {}
): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> => {
  return new Promise((resolve, reject) => {
    cp.execFile(file, args, options, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
};

/**
 * Executes a command as a child process and gets the output.
 */
const exec = async (
  command: string,
  args: string[],
  stopOnStderr: boolean = false
) => {
  const { stdout, stderr } = await pExec(command, args);
  if (stopOnStderr && stderr) throw stderr as string;
  return stdout as string;
};

export default exec;
