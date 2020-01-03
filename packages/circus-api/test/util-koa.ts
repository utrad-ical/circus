import Koa from 'koa';

export type TestServer = {
  koa: Koa;
  url: string;
  tearDown: () => Promise<void>;
};

/**
 * Starts up a Koa server for testing.
 * @param setUpFunc The function to set up Koa app with middlewares.
 * @returns The object containing the target URL and the teardown function.
 * Make sure to always call `tearDown` to stop the HTTP server.
 */
export const setUpKoaTest = async (setUpFunc: (app: Koa) => Promise<void>) => {
  const koa = new Koa();
  await setUpFunc(koa);
  const port = Number(process.env.API_TEST_PORT) || 8081;
  const host = 'localhost';
  return new Promise<TestServer>((resolve, reject) => {
    const httpd = koa.listen(port, host);
    const tearDown = () => {
      return new Promise<void>((resolve, reject) => {
        httpd.close(err => (err ? reject(err) : resolve()));
      });
    };
    httpd.on('listening', () => {
      resolve({
        url: `http://${host}:${port}/`,
        koa,
        tearDown
      });
    });
    httpd.on('error', reject);
  });
};
