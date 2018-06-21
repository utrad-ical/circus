import * as q from './queue';

describe('Mongo Queue', () => {
  it('should create mongo queue system', async () => {
    const queue = await q.craeteMongoQueue({
      mongoUrl: 'mongodb://localhost:27017/cs-core-test',
      collectionName: 'hoge'
    });
  });
});
