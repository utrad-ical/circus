import React, { useCallback, useState } from 'react';

/**
 * This is an error message box shown when the display strategy is
 * not properly configured.
 */
export const useErrorMessage = (): [
  React.ReactElement | undefined,
  (message: string) => void
] => {
  const [message, setMessage] = useState<string>();

  const setError = useCallback((message: string) => {
    setMessage(message);
  }, []);

  return [
    message ? <pre className="alert alert-danger">{message}</pre> : undefined,
    setError
  ];
};
