/**
 * Simple middleware to inject things into ctx
 */
export default function injector(objects) {
	if (!objects || typeof objects !== 'object') {
		throw new TypeError('Injected object is invalid.');
	}

	return async(ctx, next) => {
		Object.keys(objects).forEach(k => ctx[k] = objects[k]);
		await next();
	};
}
