/**
 * Basic wrapper for Mongo collection that performs validation tasks.
 */
export default function createCollectionAccessor(db, validator, opts) {
	const { schema, collectionName, primaryKey } = opts;
	const collection = db.collection(collectionName);

	/**
	 * Inserts a single document after validation succeeds.
	 */
	async function insert(data) {
		// Any error will be thrown
		const date = new Date();
		const inserting = { ...data, createdAt: date, updatedAt: date };
		await validator.validate(schema, inserting, { dbEntry: true });
		return await collection.insertOne(inserting);
	}

	/**
	 * Inserts multiple documents after validation succeeds for each document.
	 */
	async function insertMany(data) {
		const documents = [];
		const date = new Date();
		for (const doc of data) {
			const inserting = { ...doc, createdAt: date, updatedAt: date };
			await validator.validate(schema, inserting, { dbEntry: true });
			documents.push(inserting);
		}
		return await collection.insertMany(documents);
	}

	/**
	 * Fetches documents that matches the given query as an array.
	 * The `_id` field will not be included.
	 */
	async function findAll(query, options = {}) {
		const cursor = findAsCursor(query, options);
		const array = [];
		while (await cursor.hasNext()) {
			array.push(await cursor.next());
		}
		return array;
	}

	/**
	 * Executes find and returns the matched documents as a cursor-like object.
	 * Validation is performed for each document.
	 * The `_id` field will not be included.
	 */
	function findAsCursor(query, options = {}) {
		const { sort, limit, skip } = options;
		let cursor = collection.find(query).project({ _id: 0 });
		if (sort) cursor = cursor.sort(sort);
		if (skip) cursor = cursor.skip(skip);
		if (limit) cursor = cursor.limit(limit);
		return {
			next: async() => {
				const next = await cursor.next();
				await validator.validate(schema, next, { dbEntry: true });
				return next;
			},
			hasNext: () => cursor.hasNext()
		};
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
			await validator.validate(schema, result, { dbEntry: true });
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
	async function modifyOne(id, updates) {
		const key = primaryKey ? primaryKey : '_id';
		const date = new Date();
		const result = await collection.findOneAndUpdate(
			{ [key]: id },
			{ $set: { ...updates, updatedAt: date } },
			{ returnOriginal: false }
		);
		if (result.value !== null) {
			await validator.validate(schema, result.value, { dbEntry: true });
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
		findAsCursor,
		findById,
		findByIdOrFail,
		insert,
		insertMany,
		modifyOne,
		collectionName() { return collectionName; }
	};
}
