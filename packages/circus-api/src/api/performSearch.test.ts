import assert from 'node:assert/strict';
import { describe, test, it, before, after } from 'node:test';
import type { TestServer } from '../test/util-koa.ts';
import { setUpKoaTest } from '../test/util-koa.ts';
import { setUpMongoFixture, usingMongo } from '../test/util-mongo.ts';

import performSearch, {
  runAggregation,
  isPatientInfoInFilter
} from './performSearch.ts';
import type { CollectionAccessor } from '../db/createCollectionAccessor.ts';
import createCollectionAccessor from '../db/createCollectionAccessor.ts';
import createValidator from '../createValidator.ts';
import path from 'path';
import axios from 'axios';

let testServer: TestServer, items: CollectionAccessor;
let disposeMongo: () => Promise<void>;

const dbPromise = usingMongo();

before(async () => {
  const db = (await dbPromise).database.db;
  disposeMongo = (await dbPromise).dispose;
  await setUpMongoFixture(db, ['items']);
  testServer = await setUpKoaTest(async app => {
    const validator = await createValidator({
      schemaRoot: path.join(import.meta.dirname, '../../test/test-schemas')
    });
    items = createCollectionAccessor(db, validator, {
      schema: 'item',
      collectionName: 'items',
      primaryKey: 'itemId'
    });
    app.use(async (ctx, next) => {
      const q = ctx.request.query.q as string;
      const filter = q && q.length ? JSON.parse(q) : {};
      try {
        await performSearch(items, filter, ctx as any, {
          defaultSort: { price: -1 }
        });
      } catch (err: any) {
        console.error(err.errors);
        throw err;
      }
    });
  });
});

after(async () => {
  await disposeMongo();
  await testServer.tearDown();
});

test('isPatientInfoInFilter', () => {
  const i = isPatientInfoInFilter;
  assert.equal(i({ 'patientInfo.age': 7 }), true);
  assert.equal(i({ 'patientInfo.age': 7, status: false }), true);
  assert.equal(i({ status: false }), false);
  assert.equal(i({ $and: [{ 'patientInfo.age': 7, status: false }] }), true);
  assert.equal(i({ $and: [{ status: false }] }), false);
  assert.equal(i({ $or: [{ 'patientInfo.age': 7 }] }), true);
});

describe('performSearch', () => {
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
    assert.equal(res.items.length, 30);
  });

  it('should take filter', async () => {
    const res1 = await search({ query: { price: { $gt: 800 } } });
    assert.equal(res1.items.length, 6);
    assert.equal(res1.totalItems, 6);
    assert.equal(res1.page, 1);
    const res2 = await search({ query: { color: 'blue' } });
    assert.equal(res2.items.length, 3);
    assert.equal(res2.totalItems, 3);
  });

  it('should take sort', async () => {
    const res1 = await search({ sort: { price: -1 } });
    assert.equal(res1.items[0].name, 'digital firewall');
    const res2 = await search({ sort: { price: 1 } });
    assert.equal(res2.items[0].name, 'bluetooth pixel');
    const res3 = await search({ sort: { stock: 1, name: 1 } });
    assert.deepEqual(
      res3.items.map((i: any) => i.itemId).slice(0, 3),
      [28, 13, 1]
    );
  });

  it('should take paging', async () => {
    const res1 = await search({ page: 1, limit: 2, sort: { price: -1 } });
    assert.deepEqual(
      res1.items.map((i: any) => i.itemId),
      [12, 23]
    );
    assert.equal(res1.totalItems, 30);
    assert.equal(res1.page, 1);

    const res2 = await search({ page: 2, limit: 2, sort: { price: -1 } });
    assert.deepEqual(
      res2.items.map((i: any) => i.itemId),
      [28, 15]
    );
    assert.equal(res2.totalItems, 30);
    assert.equal(res2.page, 2);

    const res3 = await search({ page: 20, limit: 2, sort: { price: -1 } });
    assert.deepEqual(res3.items, []);
    assert.equal(res3.totalItems, 30);
  });
});

describe('runAggregation', () => {
  test('simple sort and limit', async () => {
    const result = await runAggregation(items, {
      limit: 3,
      skip: 1,
      sort: { price: -1 }
    });
    assert.equal(result.items.length, 3);
    assert.partialDeepStrictEqual(result.items[0], { itemId: 23 });
  });

  test('filter', async () => {
    const result = await runAggregation(items, {
      filter: { price: { $gte: 900 } }
    });
    assert.equal(result.items.length, 3);
  });

  test('group', async () => {
    const result = await runAggregation(items, {
      modifyStages: [{ $group: { _id: '$color', count: { $sum: 1 } } }],
      transform: a => ({ ...a, message: 'hello' })
    });
    const blueCount = result.items.find(r => r._id === 'blue');
    assert.deepEqual(blueCount, { _id: 'blue', count: 3, message: 'hello' });
  });
});
