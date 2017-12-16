export const handleGet = ({}) => {
	return async (ctx, next) => {
		ctx.body = ctx.project;
	};
};
