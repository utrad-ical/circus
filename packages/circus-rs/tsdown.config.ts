import fs from 'node:fs/promises';
import { defineConfig, type Rolldown } from 'tsdown';

/**
 * Inlines `import text from './file?raw'` as a string, like Vite does.
 * This lets the published package work without any bundler setup
 * on the consumer side.
 */
const rawPlugin: Rolldown.Plugin = {
  name: 'raw',
  async resolveId(source, importer) {
    if (!source.endsWith('?raw') || !importer) return null;
    const resolved = await this.resolve(source.slice(0, -4), importer, {
      skipSelf: true
    });
    return resolved ? resolved.id + '?raw' : null;
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
