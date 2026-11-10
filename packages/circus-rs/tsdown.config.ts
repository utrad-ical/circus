import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'tsdown';

/**
 * Inlines `import text from './file?raw'` as a string, like Vite does.
 * This lets the published package work without any bundler setup
 * on the consumer side.
 */
const rawPlugin = {
  name: 'raw',
  resolveId(source: string, importer: string | undefined) {
    if (!source.endsWith('?raw') || !importer) return null;
    const file = path.resolve(path.dirname(importer), source.slice(0, -4));
    return file + '?raw';
  },
  async load(id: string) {
    if (!id.endsWith('?raw')) return null;
    const content = await fs.readFile(id.slice(0, -4), 'utf8');
    return `export default ${JSON.stringify(content)};`;
  }
};

export default defineConfig([
  {
    // The viewer; bundled into a single module
    entry: { 'browser/index': 'src/browser/index.ts' },
    outDir: 'dist',
    clean: false,
    format: 'esm',
    platform: 'browser',
    fixedExtension: false,
    dts: true,
    plugins: [rawPlugin]
  },
  {
    // RS server; the file structure is kept because ServiceLoader
    // loads modules by path at runtime
    entry: [
      'src/server/**/*.ts',
      'src/volume/**/*.ts',
      'src/dicom/**/*.ts',
      'src/common/**/*.ts',
      '!src/**/*.test.ts',
      '!src/**/*.d.ts'
    ],
    root: 'src',
    outDir: 'dist',
    clean: false,
    format: 'esm',
    platform: 'node',
    unbundle: true,
    fixedExtension: false,
    dts: true,
    plugins: [rawPlugin]
  }
]);
