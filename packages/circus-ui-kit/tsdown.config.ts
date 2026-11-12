import fs from 'node:fs/promises';
import { defineConfig, type Rolldown } from 'tsdown';

/** Inlines `import text from './file?raw'` as a string, like Vite does */
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

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'dist',
  format: 'esm',
  platform: 'browser',
  fixedExtension: false,
  dts: true,
  plugins: [rawPlugin]
});
