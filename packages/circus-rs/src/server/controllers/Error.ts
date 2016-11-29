// This class is needed because TypeScript currently
// cannot properly directly extend native Error class.
// This CustomError is a workaround found here:
// https://github.com/Microsoft/TypeScript/issues/10166#issuecomment-244614940
// We may remove this by targeting at ES6.
class CustomError extends Error {
	constructor(message: string) {
		super();
		this.message = message;
	}
}

export class StatusError extends CustomError {
	public status: number;
	public stack: string | undefined;

	public static notFound(message: string): StatusError {
		return new StatusError(404, message);
	}

	public static badRequest(message: string): StatusError {
		return new StatusError(400, message);
	}

	public static internalServerError(message: string): StatusError {
		return new StatusError(500, message);
	}

	public static unauthorized(message: string): StatusError {
		return new StatusError(401, message);
	}

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}
