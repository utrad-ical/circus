import { defineConfig } from 'tsdown';

export default defineConfig({
  // The file structure is kept because ServiceLoader loads modules
  // (e.g., loggers) by path at runtime
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
  root: 'src',
  outDir: 'dist',
  format: 'esm',
  platform: 'node',
  unbundle: true,
  fixedExtension: false,
  dts: true
});
