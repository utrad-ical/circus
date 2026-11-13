import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'dist',
  format: 'esm',
  platform: 'browser',
  fixedExtension: false,
  dts: true
});
