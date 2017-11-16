import status from 'http-status';
import rawBody from 'raw-body';
import { createHash } from 'crypto';

const sha1 = buf => {
	const sha1 = createHash('sha1');
	sha1.update(buf);
	return sha1.digest('hex');
};

export const handleGet = async (ctx, next) => {
	const hash = ctx.params.hash;
	try {
		const file = await ctx.blobStorage.read(hash);
		ctx.type = 'application/octet-stream';
		ctx.body = file;
	} catch (err) {
		ctx.throw(status.NOT_FOUND);
	}
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
