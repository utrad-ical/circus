import localStorage from './localStorage';
import memoryStorage from './memoryStorage';

/**
 * Provides simple key-value storage
 */
export default async function createStorage(type, params) {
	switch (type) {
		case 'local':
			return await localStorage(params);
		case 'memory':
			return await memoryStorage(params);
	}
	throw Error('This storage type is not supported');
}
