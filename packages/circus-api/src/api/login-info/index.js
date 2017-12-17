// import status from 'http-status';

export const handleGet = () => {
	return async (ctx, next) => {
		const user = ctx.user;
		ctx.body = {
			userEmail: user.userEmail,
			loginId: user.loginId
		};
	};
};

export const handleGetFull = ({ dicomImageServerUrl, uploadFileSizeMax }) => {
	return async (ctx, next) => {
		const user = { ...ctx.user };
		delete user.password;
		ctx.body = {
			...user,
			...ctx.userPrivileges,
			dicomImageServer: dicomImageServerUrl,
			uploadFileMax: 30,
			uploadFileSizeMax: uploadFileSizeMax.toUpperCase()
		};
	};
};
