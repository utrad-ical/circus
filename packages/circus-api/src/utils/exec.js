import * as cp from 'child_process';

/**
 * Executes a command as a child process and gets the output.
 * @param {string} command
 * @param {string[]} args
 * @param {boolean} stopOnStderr
 * @returns {Promise<string>}
 */
export default function exec(command, args, stopOnStderr = false) {
  return new Promise((resolve, reject) => {
    cp.execFile(command, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else if (stopOnStderr && stderr) reject(stderr);
      else resolve(stdout);
    });
  });
}
