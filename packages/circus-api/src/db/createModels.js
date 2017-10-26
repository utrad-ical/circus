import createCollectionAccessor from './createCollectionAccessor';

export default function createModels(db, validator) {
	const user = createCollectionAccessor(db, validator, {
		schema: 'user',
		collectionName: 'users',
		primaryKey: 'userEmail'
	});

	const token = createCollectionAccessor(db, validator, {
		schema: 'token',
		collectionName: 'tokens',
		primaryKey: 'accessToken'
	});

	return { user, token };
}
