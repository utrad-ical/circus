import localStorage from './localStorage';

/**
 * Provides simple key-value storage
 */
export default async function createStorage(type, params) {
	if (type !== 'local') throw Error('not yet supported');
	return await localStorage(params);
}
