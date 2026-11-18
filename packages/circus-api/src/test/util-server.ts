import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { createNullLogger } from '@utrad-ical/circus-lib';
import { createHonoApp } from '../createHonoApp.ts';

export type TestServer = {
  url: string;
  tearDown: () => Promise<void>;
};

export const setUpHonoTest = async (
  setUp: (app: ReturnType<typeof createHonoApp>) => void | Promise<void>,
  options: { debug?: boolean; corsOrigin?: string } = {}
) => {
  const app = createHonoApp({
    logger: createNullLogger(),
    ...options
  });
  await setUp(app);
  return setUpTestServer(
    createServer(
      getRequestListener(app.fetch, { overrideGlobalObjects: false })
    )
  );
};

export const setUpTestServer = (server: Server) => {
  const port = Number(process.env.API_TEST_PORT) || 8090;
  const host = 'localhost';
  // Tests recreate servers on the same port.
  server.prependListener('request', (_req, res) =>
    res.setHeader('Connection', 'close')
  );
  return new Promise<TestServer>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve({
        url: `http://${host}:${port}/`,
        tearDown: () =>
          new Promise<void>((resolve, reject) => {
            server.close(err => (err ? reject(err) : resolve()));
          })
      });
    });
  });
};
