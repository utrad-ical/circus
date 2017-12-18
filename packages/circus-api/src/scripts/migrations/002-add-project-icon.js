export async function up(db) {
	await db.collection('projects').updateMany(
		{},
		{
			$set: {
				icon: {
					glyph: 'calc',
					color: '#ffffcc',
					backgroundColor: '#248065'
				}
			}
		}
	);
}
