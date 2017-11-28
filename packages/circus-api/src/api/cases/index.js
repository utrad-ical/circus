import status from 'http-status';
import performSearch from '../performSearch';

export const handleGet = () => {
	return async (ctx, next) => {
		const aCase = ctx.case;
		delete aCase.latestRevision; // Remove redundant data
		ctx.body = aCase;
	};
};

export const handlePost = () => {
	return async (ctx, next) => {
		ctx.throw(status.NOT_IMPLEMENTED);
	};
};

export const handlePostRevision = ({ models }) => {
	return async (ctx, next) => {
		const aCase = ctx.case;
		const rev = ctx.request.body;

		if (rev.date) { ctx.throw(status.BAD_REQUEST, 'You cannot specify revision date.'); }
		if (rev.creator) { ctx.throw(status.BAD_REQUEST, 'You cannot specify revision creator.'); }

		rev.date = new Date();
		rev.creator = ctx.user.userEmail;

		await models.clinicalCase.modifyOne(aCase.caseId, {
			latestRevision: rev,
			revisions: [
				...aCase.revisions,
				rev
			]
		});
		ctx.body = null; // No Content
	};
};

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		const urlQuery = ctx.request.query;
		let customFilter;
		try {
			customFilter = urlQuery.filter ? JSON.parse(urlQuery.filter) : {};
		} catch (err) {
			ctx.throw(status.BAD_REQUEST, 'Bad filter.');
		}
		const domainFilter = {};
		const filter = { $and: [customFilter, domainFilter]};
		await performSearch(models.clinicalCase, filter, ctx);
	};
};