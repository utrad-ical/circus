import createCollectionAccessor from './createCollectionAccessor';

export default function createModels(db, validator) {
	const user = createCollectionAccessor(db, validator, {
		schema: 'userAll',
		collectionName: 'users',
		primaryKey: 'userEmail'
	});

	return { user };
}