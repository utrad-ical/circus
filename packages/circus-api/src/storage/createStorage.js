import localStorage from './localStorage';
import memoryStorage from './memoryStorage';

/**
 * Provides simple asynchronous key-value storage.
 * @param {'local'|'memory'} type
 * @param {object} params
 */
export default async function createStorage(type, params = {}) {
	switch (type) {
		case 'local':
			return await localStorage(params);
		case 'memory':
			return await memoryStorage();
	}
	throw Error('This storage type is not supported');
}
