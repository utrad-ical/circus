import status from 'http-status';

export default async function performSearch(model, query, ctx, opts = {}) {
	const urlQuery = ctx.request.query;
	const { defaultSort = {}, transform } = opts;

	const sort = urlQuery.sort ? JSON.parse(urlQuery.sort) : defaultSort;
	if (typeof sort !== 'object') {
		ctx.throw(status.BAD_REQUEST, 'Bad sort parameter.');
	}
	for (const k in sort) {
		if (sort[k] !== 1 && sort[k] !== -1) {
			ctx.throw(status.BAD_REQUEST, 'Bad sort parameter.');
		}
	}

	const limit = parseInt(urlQuery.limit || '20', 10);
	if (limit > 200) {
		ctx.throw(status.BAD_REQUEST, 'You cannot query more than 200 items at a time.');
	}

	const page = parseInt(urlQuery.page || '1', 10);
	const skip = limit * (page - 1);

	const rawResults = await model.findAll(query, { limit, skip, sort });
	const results = transform ? rawResults.map(transform) : rawResults;
	ctx.body = results;
}