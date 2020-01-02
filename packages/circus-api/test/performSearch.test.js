import * as test from './test-utils';
import performSearch from '../src/api/performSearch';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import createValidator from '../src/createValidator';
import { assert } from 'chai';
import axios from 'axios';

describe('performSearch', function() {
  let db, dbConnection, server;

  before(async function() {
    ({ db, dbConnection } = await test.connectMongo());
    await test.setUpMongoFixture(db, ['items']);
    const app = await test.setUpKoa(async app => {
      const validator = await createValidator(__dirname + '/test-schemas');
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
    server = await test.listenKoa(app);
  });

  after(async function() {
    await test.tearDownKoa(server);
    await dbConnection.close();
  });

  async function search({ query = {}, sort, limit, page } = {}) {
    const res = await axios.get(server.url, {
      params: {
        q: JSON.stringify(query),
        sort: JSON.stringify(sort),
        limit,
        page
      }
    });
    return res.data;
  }

  it('should perform search', async function() {
    const res = await search({ limit: 100 });
    assert.equal(res.items.length, 30);
  });

  it('should take filter', async function() {
    const res1 = await search({ query: { price: { $gt: 800 } } });
    assert.equal(res1.items.length, 6);
    assert.equal(res1.totalItems, 6);
    assert.equal(res1.page, 1);
    const res2 = await search({ query: { color: 'blue' } });
    assert.equal(res2.items.length, 3);
    assert.equal(res2.totalItems, 3);
  });

  it('should take sort', async function() {
    const res1 = await search({ sort: { price: -1 } });
    assert.equal(res1.items[0].name, 'digital firewall');
    const res2 = await search({ sort: { price: 1 } });
    assert.equal(res2.items[0].name, 'bluetooth pixel');
    const res3 = await search({ sort: { stock: 1, name: 1 } });
    assert.deepEqual(res3.items.map(i => i.itemId).slice(0, 3), [28, 13, 1]);
  });

  it('should take paging', async function() {
    const res1 = await search({ page: 1, limit: 2, sort: { price: -1 } });
    assert.deepEqual(
      res1.items.map(i => i.itemId),
      [12, 23]
    );
    assert.equal(res1.totalItems, 30);
    assert.equal(res1.page, 1);

    const res2 = await search({ page: 2, limit: 2, sort: { price: -1 } });
    assert.deepEqual(
      res2.items.map(i => i.itemId),
      [28, 15]
    );
    assert.equal(res2.totalItems, 30);
    assert.equal(res2.page, 2);

    const res3 = await search({ page: 20, limit: 2, sort: { price: -1 } });
    assert.deepEqual(res3.items, []);
    assert.equal(res3.totalItems, 30);
  });
});
