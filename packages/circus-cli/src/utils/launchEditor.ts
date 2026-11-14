import * as cp from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Launch an editor for the given text.
 * @param original - The text to edit.
 * @returns The text after editing.
 */
const launchEditor = async (
  original: string,
  ext: string = 'txt'
): Promise<string> => {
  const editor =
    process.env.VISUAL ??
    process.env.EDITOR ??
    (os.platform() === 'win32' ? 'notepad' : 'vi');
  // A new directory only the user can access (0700) keeps the content private
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'circus-cli-'));
  const tempFile = path.join(tempDir, `edit.${ext}`);
  try {
    await fs.writeFile(tempFile, original, { encoding: 'utf8', mode: 0o600 });
    await new Promise<void>((resolve, reject) => {
      const child = cp.spawn(editor, [tempFile], {
        stdio: 'inherit',
        shell: true
      });
      child.on('exit', code => {
        if (code === 0) resolve();
        else reject(new Error(`Editor exited with code ${code}`));
      });
    });
    const result = await fs.readFile(tempFile, 'utf8');
    return result;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

export default launchEditor;
