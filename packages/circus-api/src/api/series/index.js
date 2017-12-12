import status from 'http-status';
import performSearch from '../performSearch';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as JSZip from 'jszip';

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const uid = ctx.params.seriesUid;
		const series = await models.series.findByIdOrFail(uid);
		ctx.body = series;
	};
};

export const handlePost = ({ dicomImporter }) => {

	async function importFromBuffer(buffer) {
		const signature = buffer.readUInt32BE(0x80, true);
		if (signature !== 0x4449434D) {
			return; // Non-DICOM file
		}
		let tmpFile;
		try {
			tmpFile = path.join(dicomImporter.workDir, 'import.dcm');
			await fs.writeFile(tmpFile, buffer);
			await dicomImporter.importFromFile(tmpFile);
		} finally {
			await fs.unlink(tmpFile);
		}
	}

	return async (ctx, next) => {
		if (!dicomImporter) {
			ctx.throw(status.SERVICE_UNAVAILABLE);
		}

		// koa-multer sets loaded files to ctx.req, not ctx.request
		const files = ctx.req.files;
		let count = 0;
		for (const entry of files) {
			const signature = entry.buffer.readUInt32BE(0, true);
			if (signature === 0x504B0304 || signature === 0x504B0506 || signature === 0x504B0708) {
				// ZIP file detected.
				const archive = await JSZip.loadAsync(entry.buffer);
				const filesInArchive = [];
				archive.forEach((r, f) => filesInArchive.push(f));
				for (const file of filesInArchive) {
					const buf = await file.async('nodebuffer');
					await importFromBuffer(buf);
					count++;
				}
			} else {
				await importFromBuffer(entry.buffer);
				count++;
			}
		}
		ctx.body = { uploaded: count };
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
