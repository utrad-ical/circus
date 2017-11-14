import status from 'http-status';
// import fs from 'fs-extra';
import rawBody from 'raw-body';
import * as crypto from 'crypto';

const sha1 = buf => {
	const shasum = crypto.createHash('sha1');
	shasum.update(buf);
	return shasum.digest('hex');
};

export const handleGet = async (ctx, next) => {
	const hash = ctx.params.hash;
	const file = await ctx.blobStorage.read(hash);
	ctx.type = 'application/octet-stream';
	ctx.body = file;
};

export const handlePut = async (ctx, next) => {
	const file = await rawBody(ctx.req, { limit: '2mb' });
	const hash = ctx.params.hash;
	if (file.length === 0) {
		ctx.throw(status.BAD_REQUEST, 'Empty content was sent.');
	}
	if (sha1(file) !== hash) {
		ctx.throw(status.BAD_REQUEST, 'Hash mismatch.');
	}
	await ctx.blobStorage.write(hash, file);
	ctx.body = null;
	ctx.status = status.OK;
};
