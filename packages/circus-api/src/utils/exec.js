import * as cp from 'child_process';

/**
 * Executes a command as a child process and gets the output.
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export default function exec(command, args) {
  return new Promise((resolve, reject) => {
    cp.execFile(command, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else if (stderr) reject(err);
      else resolve(stdout);
    });
  });
}
