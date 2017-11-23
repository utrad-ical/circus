import status from 'http-status';

export const handleGet = () => {
	return async (ctx, next) => {
		ctx.body = ctx.case;
	};
};

export const handlePost = () => {
	return async (ctx, next) => {
		ctx.throw(status.NOT_IMPLEMENTED);
	};
};

export const handlePostRevision = () => {
	return async (ctx, next) => {
		ctx.throw(status.NOT_IMPLEMENTED);
	};
};

export const handleSearch = () => {
	return async (ctx, next) => {
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
};