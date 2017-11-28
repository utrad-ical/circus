import status from 'http-status';
import * as fs from 'fs-extra';
import * as path from 'path';

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const uid = ctx.params.seriesUid;
		const series = await models.series.findByIdOrFail(uid);
		ctx.body = series;
	};
};

export const handlePost = ({ dicomImporter }) => {
	return async (ctx, next) => {
		// koa-multer sets loaded files to ctx.req, not ctx.request
		const files = ctx.req.files;
		for (const entry of files) {
			let tmpFile;
			try {
				tmpFile = path.join(dicomImporter.workDir, 'import.dcm');
				await fs.writeFile(tmpFile, entry.buffer);
				await dicomImporter.importFromFile(tmpFile);
			} finally {
				await fs.unlink(tmpFile);
			}
		}
		ctx.body = null;
	};
};

export const handleSearch = ({ models }) => {
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
		const series = await models.series.findAll(
			query, { limit, skip, sort }
		);
		ctx.body = series;
	};
};
