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
  const tempFile = path.join(
    os.tmpdir(),
    `${Math.random().toString(36).slice(-7)}.${ext}`
  );
  await fs.writeFile(tempFile, original, 'utf8');
  try {
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
    await fs.unlink(tempFile);
  }
};

export default launchEditor;
