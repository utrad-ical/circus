import { PassThrough } from 'stream';

export async function handleGet(ctx, next) {
	ctx.body = {
		status: 'running'
	};
}

export async function handleEcho(ctx, next) {
	ctx.body = ctx.request.body;
}

async function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleDummyProgress(ctx, next) {
	const stream = new PassThrough();
	ctx.body = stream;
	ctx.type = 'text/event-stream';

	for (let i = 0; i <= 10; i++) {
		await delay(500);
		stream.write(
			'event: progress\n' +
			'data: ' + JSON.stringify({ progress: i * 10 }) + '\n\n'
		);
	}
	stream.end();
}