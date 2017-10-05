import createCollectionAccessor from './createCollectionAccessor';

export default function createModels(db, validator) {
	const user = createCollectionAccessor(db, validator, {
		schema: 'userAll',
		collectionName: 'users',
		primaryKey: 'userEmail'
	});

	const token = createCollectionAccessor(db, validator, {
		schema: 'tokenAll',
		collectionName: 'tokens',
		primaryKey: 'accessToken'
	});

	return { user, token };
}