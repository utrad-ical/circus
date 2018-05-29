import randomstring from 'randomstring';
import * as cp from 'child_process';

export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateProjectId() {
  return randomstring.generate({ length: 32, charset: 'hex' });
}

export function generateCaseId() {
  return randomstring.generate({ length: 32, charset: 'hex' });
}

export function generateJobId() {
  return randomstring.generate({ length: 32, charset: 'hex' });
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
