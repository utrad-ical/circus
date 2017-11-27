export default async function memoryStorage(params = {}) {
	const store = {};

	/**
	 * @param {string} key
	 */
	async function read(key) {
		if (key in store) {
			return Buffer.from(store[key]);
		} else {
			throw new Error('not found');
		}
	}

	/**
	 * @param {string} key
	 * @param {Buffer} data
	 */
	async function write(key, data) {
		store[key] = data;
	}

	/**
	 * @param {string} key
	 */
	async function remove(key) {
		delete store[key];
	}

	/**
	 * @param {string} key
	 */
	async function exists(key) {
		// using fs-extra's extention method
		return key in store;
	}

	return { read, write, remove, exists };
}
