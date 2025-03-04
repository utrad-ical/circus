import { createWriteStream } from 'node:fs';
import { opendir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Writable } from 'node:stream';

async function openAsBlob(filePath: string): Promise<Blob> {
  const buffer = await readFile(filePath);
  return new Blob([buffer]);
}

export const extractFormFilesToDirectory = async (
  files: File[],
  destDir: string
) => {
  for (const file of files) {
    const dest = Writable.toWeb(
      createWriteStream(path.join(destDir, file.name))
    );
    await file.stream().pipeTo(dest);
  }
};

export const appendDirectoryToFormData = async (
  fd: FormData,
  dirPath: string,
  name = 'files'
) => {
  const dir = await opendir(dirPath);
  for await (const dirent of dir) {
    const path = `${dirPath}/${dirent.name}`;
    if (dirent.isFile()) {
      const blob = await openAsBlob(path);
      const file = new File([blob], dirent.name);
      fd.append(name, file);
    }
  }
};
