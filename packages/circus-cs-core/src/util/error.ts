export const isNodeError = (error: any): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};

export const formatError = (error: any): string => {
  if (isNodeError(error)) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Unknown error';
};
