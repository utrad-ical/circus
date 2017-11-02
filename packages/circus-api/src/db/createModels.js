import createCollectionAccessor from './createCollectionAccessor';

export default function createModels(db, validator) {
	const modelDefinitions = {
		user: { col: 'users', pk: 'userEmail' },
		group: { col: 'groups', pk: 'groupId' },
		project: { col: 'projects', pk: 'projectId' },
		series: { col: 'series', pk: 'seriesUid' },
		clinicalCase: { col: 'clinicalCases', pk: 'caseId' },
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
