import status from 'http-status';

export const handleGet = async (ctx, next) => {
	const caseId = ctx.params.caseId;
	const item = await ctx.models.clinicalCase.findByIdOrFail(caseId);
	ctx.body = item;
};

export const handlePost = async (ctx, next) => {
	ctx.throw(status.NOT_IMPLEMENTED);
};

export const handlePostRevision = async (ctx, next) => {
	ctx.throw(status.NOT_IMPLEMENTED);
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
	const cases = await ctx.models.clinicalCase.findAll(
		query, { limit, skip, sort }
	);
	ctx.body = cases;
};
