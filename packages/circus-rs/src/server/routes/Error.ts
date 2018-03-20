function newError(status: number): (message: string) => Error {
  return function(message: string): Error {
    const err = new Error(message);
    err.status = status;
    err.expose = true;
    return err;
  };
}

const statusErrors = {
  badRequest: newError(400),
  notFound: newError(404),
  unauthorized: newError(401),
  internalServerError: newError(500)
};

export default statusErrors;
