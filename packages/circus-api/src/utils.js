import * as cp from 'child_process';
import { ulid } from 'ulid';

/**
 * Used as a unique ID for project, case, etc.
 */
export function generateUniqueId() {
  return ulid().toLowerCase();
}

/**
 * Executes a command as a child process and gets the output.
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export function exec(command, args) {
  return new Promise((resolve, reject) => {
    cp.execFile(command, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else if (stderr) reject(err);
      else resolve(stdout);
    });
  });
}
