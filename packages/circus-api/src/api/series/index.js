import status from 'http-status';

export const handleGet = async (ctx, next) => {
	const uid = ctx.params.seriesUid;
	const series = await ctx.models.series.findByIdOrFail(uid);
	ctx.body = series;
};

export const handlePost = async (ctx, next) => {
	// koa-multer sets loaded files to ctx.req, not ctx.request
	const files = ctx.req.files;
	// console.log(files);
	ctx.body = null;
};

export const handleSearch = async (ctx, next) => {
	const urlQuery = ctx.request.query;
	const { query, sort } = (() => {
		try {
			return {
				query: JSON.parse(urlQuery.query),
				sort: JSON.parse(urlQuery.sort)
			};
		} catch (err) {
			ctx.throw(status.BAD_REQUEST, 'Malformed query.');
		}
	});
	const limit = parseInt(urlQuery.limit || '20', 10);
	if (limit > 200) {
		ctx.throw(status.BAD_REQUEST, 'You cannot query more than 200 items at a time.');
	}
	const page = parseInt(urlQuery.page || '1', 10);
	const skip = limit * (page - 1);
	const series = await ctx.models.series.findAll(
		query, { limit, skip, sort }
	);
	ctx.body = series;
};
