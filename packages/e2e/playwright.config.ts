import { defineConfig } from '@playwright/test';
import { webPort } from './env.ts';

export default defineConfig({
  testDir: 'tests',
  globalSetup: './setup.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    viewport: { width: 1600, height: 900 },
    screenshot: 'only-on-failure'
  }
});
