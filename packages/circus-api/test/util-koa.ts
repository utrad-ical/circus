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
  return setUpKoaTestWith(koa);
};

export const setUpKoaTestWith = (koa: Koa): Promise<TestServer> => {
  const port = 0;
  const host = 'localhost';
  return new Promise<TestServer>((resolve, reject) => {
    const httpd = koa.listen(port, host, () => {
      const address = httpd.address();
      if (address && typeof address === 'object' && address.port) {
        const assignedPort = address.port;
        console.log(`Server is running on port ${assignedPort}`);
        resolve({
          url: `http://${host}:${assignedPort}/`,
          koa,
          tearDown: () => {
            return new Promise<void>((resolve, reject) => {
              httpd.close(err => (err ? reject(err) : resolve()));
            });
          }
        });
      } else {
        reject(new Error('Failed to get assigned port'));
      }
    });
    httpd.on('error', reject);
  });
};
