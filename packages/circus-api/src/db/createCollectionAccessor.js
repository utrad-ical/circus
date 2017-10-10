/**
 * Basic wrapper for Mongo collection that performs validation tasks.
 */
export default function createCollectionAccessor(db, validator, opts) {
	const { schema, collectionName, primaryKey } = opts;
	const collection = db.collection(collectionName);

	/**
	 * Inserts a single document after validation.
	 */
	async function insert(data) {
		// Any error will be thrown
		await validator.validate(
			schema,
			data,
			validator.allRequired,
			validator.withDates
		);
		return await collection.insertOne.apply(collection, arguments);
	}

	/**
	 * Inserts multiple documents after validation.
	 */
	async function insertMany(data) {
		for (const doc of data) {
			await validator.validate(
				schema,
				doc,
				validator.allRequired,
				validator.withDates
			);
		}
		return await collection.insertMany.apply(collection, arguments);
	}

	/**
	 * Fetches documents that matches the given query as an array.
	 * The `_id` field will not be included.
	 */
	async function findAll() {
		const results = await collection.find.apply(collection, arguments)
			.project({ _id: 0 }).toArray();
		for (const doc of results) {
			await validator.validate(schema, doc);
		}
		return results;
	}

	/**
	 * Fetches the single document that matches the primary key.
	 */
	async function findById(id) {
		const key = primaryKey ? primaryKey : '_id';
		const docs = await collection.find({ [key]: id })
			.project({ _id: 0 }).limit(1).toArray();
		const result = docs[0];
		if (result !== undefined) {
			await validator.validate(schema, result);
		}
		return result;
	}

	/**
	 * Fetches the single document by the primary key.
	 * Throws an error with 404 status if nothing found.
	 */
	async function findByIdOrFail(id) {
		const result = await findById(id);
		if (result === undefined) {
			const err = new Error('The requested resource was not found.');
			err.status = 404;
			err.expose = true;
			throw err;
		}
		return result;
	}

	/**
	 * Modifies the document by the primary key.
	 */
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
	const boundPassthrough = {};
	passthrough.forEach(method => {
		boundPassthrough[method] = collection[method].bind(collection);
	});

	return {
		...boundPassthrough,
		findAll,
		findById,
		findByIdOrFail,
		insert,
		insertMany,
		modifyOne
	};
}
