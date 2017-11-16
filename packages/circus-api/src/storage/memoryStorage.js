export default async function memoryStorage() {
	const store = {};

	async function read(key) {
		return await Buffer.from(store[key]);
	}

	async function write(key, data) {
		store[key] = data;
	}

	async function remove(key) {
		delete store[key];
	}

	async function exists(key) {
		// using fs-extra's extention method
		return key in store;
	}

	return { read, write, remove, exists };
}
