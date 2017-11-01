import injector from '../src/middleware/injector';
import axios from 'axios';
import { assert } from 'chai';
import { setUpKoa, listenKoa, tearDownKoa } from './test-utils';

describe('injector middleware', function() {
	it('should inject objects into ctx', async function() {
		const app = await setUpKoa(async app => {
			app.use(injector({ a: 'a', n: 10 }));
			app.use(ctx => {
				ctx.body = ctx.a + ctx.n;
			});
		});

		const server = await listenKoa(app);

		const res = await axios.request({
			method: 'get',
			url: server.url
		});

		assert.equal(res.data, 'a10');

		await tearDownKoa(server);
	});
});