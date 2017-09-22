const data = [
	{ userEmail: 'example@example.com', loginID: 'alice' },
	{ userEmail: 'example2@example.com', loginID: 'bob' }
];

export const handleSearch = async (ctx, next) => {
	ctx.body = data;
	await next();
};

export const handleGet = async (ctx, next) => {
	const email = ctx.params.userID;
	const user = data.find(user => user.userEmail = email);
	if (!user) ctx.throw(404, 'Not found');
	ctx.body = user;
	await next();
};

export const handlePut = async (ctx, next) => {
	ctx.throw(400);
	await next();
};

