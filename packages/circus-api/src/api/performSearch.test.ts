import { setUpKoaTest, TestServer } from '../../test/util-koa';
import { setUpMongoFixture, usingMongo } from '../../test/util-mongo';

import performSearch from './performSearch';
import createCollectionAccessor from '../db/createCollectionAccessor';
import createValidator from '../createValidator';
import path from 'path';
import axios from 'axios';

let testServer: TestServer;

const dbPromise = usingMongo();

beforeAll(async () => {
  const db = await dbPromise;
  await setUpMongoFixture(db, ['items']);
  testServer = await setUpKoaTest(async app => {
    const validator = await createValidator(
      path.join(__dirname, '../../test/test-schemas')
    );
    const items = createCollectionAccessor(db, validator, {
      schema: 'item',
      collectionName: 'items',
      primaryKey: 'itemId'
    });
    app.use(async (ctx, next) => {
      const q = ctx.request.query.q;
      const filter = q && q.length ? JSON.parse(q) : {};
      try {
        await performSearch(items, filter, ctx, {
          defaultSort: { price: -1 }
        });
      } catch (err) {
        console.error(err.errors);
        throw err;
      }
    });
  });
});

afterAll(async () => {
  await testServer.tearDown();
});

const search = async ({
  query = {},
  sort,
  limit,
  page
}: { query?: any; sort?: any; limit?: any; page?: any } = {}) => {
  const res = await axios.get(testServer.url, {
    params: {
      q: JSON.stringify(query),
      sort: JSON.stringify(sort),
      limit,
      page
    }
  });
  return res.data;
};

it('should perform search', async () => {
  const res = await search({ limit: 100 });
  expect(res.items).toHaveLength(30);
});

it('should take filter', async () => {
  const res1 = await search({ query: { price: { $gt: 800 } } });
  expect(res1.items.length).toBe(6);
  expect(res1.totalItems).toBe(6);
  expect(res1.page).toBe(1);
  const res2 = await search({ query: { color: 'blue' } });
  expect(res2.items.length).toBe(3);
  expect(res2.totalItems).toBe(3);
});

it('should take sort', async () => {
  const res1 = await search({ sort: { price: -1 } });
  expect(res1.items[0].name).toBe('digital firewall');
  const res2 = await search({ sort: { price: 1 } });
  expect(res2.items[0].name).toBe('bluetooth pixel');
  const res3 = await search({ sort: { stock: 1, name: 1 } });
  expect(res3.items.map((i: any) => i.itemId).slice(0, 3)).toEqual([28, 13, 1]);
});

it('should take paging', async () => {
  const res1 = await search({ page: 1, limit: 2, sort: { price: -1 } });
  expect(res1.items.map((i: any) => i.itemId)).toEqual([12, 23]);
  expect(res1.totalItems).toBe(30);
  expect(res1.page).toBe(1);

  const res2 = await search({ page: 2, limit: 2, sort: { price: -1 } });
  expect(res2.items.map((i: any) => i.itemId)).toEqual([28, 15]);
  expect(res2.totalItems).toBe(30);
  expect(res2.page).toBe(2);

  const res3 = await search({ page: 20, limit: 2, sort: { price: -1 } });
  expect(res3.items).toEqual([]);
  expect(res3.totalItems).toBe(30);
});
