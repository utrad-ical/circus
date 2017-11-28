import status from 'http-status';
import performSearch from '../performSearch';
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
		let customFilter;
		try {
			customFilter = urlQuery.filter ? JSON.parse(urlQuery.filter) : {};
		} catch (err) {
			ctx.throw(status.BAD_REQUEST, 'Bad filter.');
		}
		const domainFilter = {};
		const filter = { $and: [customFilter, domainFilter]};
		await performSearch(models.series, filter, ctx);
	};
};
