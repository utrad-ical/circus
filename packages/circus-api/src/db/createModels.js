import createCollectionAccessor from './createCollectionAccessor';

export default function createModels(db, validator) {
	const modelDefinitions = {
		user: { col: 'users', pk: 'userEmail' },
		token: { col: 'tokens', pk: 'accessToken' }
	};

	const models = {};
	Object.keys(modelDefinitions).forEach(k => {
		const def = modelDefinitions[k];
		models[k] = createCollectionAccessor(db, validator,
			{ schema: k, collectionName: def.col, primaryKey: def.pk }
		);
	});

	return models;
}
