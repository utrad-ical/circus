/**
 * Basic wrapper for Mongo collection that performs validation tasks
 */
export default function createCollectionAccessor(db, opts) {
	const { validator, schema, collectionName, primaryKey } = opts;
	const collection = db.collection(collectionName);

	async function insert(data) {
		await validator.validate(schema, data); // Any error is thrown
		return await collection.insertOne.apply(collection, arguments);
	}

	async function insertMany(data) {
		for (const doc of data) {
			await validator.validate(schema, doc);
		}
		return await collection.insertMany.apply(collection, arguments);
	}

	async function findAll() {
		const results = await collection.find.apply(collection, arguments).toArray();
		for (const doc of results) {
			await validator.validate(schema, doc);
		}
		return results;
	}

	async function getOne(id) {
		const key = primaryKey ? primaryKey : '_id';
		const docs = await collection.find({ [key]: id }).limit(1).toArray();
		const result = docs[0];
		if (result !== undefined) {
			await validator.validate(schema, result);
		}
		return result;
	}

	async function getOneAndFail(id) {
		const result = await getOne(id);
		if (result === undefined) {
			const err = new Error('The requested resource was not found.');
			err.status = 404;
			err.expose = true;
			throw err;
		}
		return result;
	}

	async function modifyOne(id, update) {
		const key = primaryKey ? primaryKey : '_id';
		const result = await collection.findOneAndUpdate(
			{ [key]: id }, update, { returnOriginal: false }
		);
		if (result.value !== null) {
			await validator.validate(schema, result.value);
		}
		return result.value;
	}

	// These methods are exposed as-is for now
	const passthrough = ['find', 'deleteMany', 'deleteOne'];

	const methods = {};
	passthrough.forEach(method => methods[method] = collection[method].bind(collection));

	return {
		...methods,
		findAll,
		getOne,
		getOneAndFail,
		insert,
		insertMany,
		modifyOne
	};
}
