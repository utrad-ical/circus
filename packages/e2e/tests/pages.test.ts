// Opens each page and checks that it shows no errors
import { expect, test } from '@playwright/test';

const pages = [
  '/home',
  '/browse/series',
  '/browse/case',
  '/browse/plugin-jobs',
  '/browse/series/mylist',
  '/browse/case/mylist',
  '/browse/plugin-jobs/mylist',
  '/plugin-job-queue',
  '/import-series',
  '/import-case',
  '/preference',
  '/tokens',
  '/admin',
  '/admin/general',
  '/admin/group',
  '/admin/user',
  '/admin/project',
  '/admin/plugin-job-manager',
  '/admin/plugins',
  '/admin/plugin-job-queue',
  '/series/:seriesUid',
  '/new-case/:seriesUid',
  '/new-job/:seriesUid',
  '/case/:caseId',
  '/plugin-job/:jobId'
];

test.beforeEach(async ({ page }) => {
  const res = await page.request.post('/api/session', {
    data: { username: 'circus', password: 'circus' },
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  expect(res.ok()).toBe(true);
});

for (const path of pages) {
  test(path, async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', err => problems.push(`page error: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
    });
    page.on('response', res => {
      if (res.url().includes('/api/') && res.status() >= 400) {
        problems.push(`HTTP ${res.status()}: ${new URL(res.url()).pathname}`);
      }
    });
    // IDs of the data added by the setup
    const ids = JSON.parse(process.env.E2E_SEED!);
    await page.goto(path.replace(/:(\w+)/, (_, key) => ids[key]));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });
}
