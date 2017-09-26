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

	Promise.resolve().then(async () => {
		for (let i = 0; i <= 50; i++) {
			await delay(100);
			const data = {
				progress: i * 2,
				message: `${i * 2}% done.`
			};
			stream.write(
				'event: progress\n' +
				'data: ' + JSON.stringify(data) + '\n\n'
			);
		}
		stream.end('event: complete\n\n');
	});
}