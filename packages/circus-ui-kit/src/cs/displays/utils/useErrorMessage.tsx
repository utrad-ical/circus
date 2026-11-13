import React, { useCallback, useState } from 'react';
import { MessageBox } from './MessageBox.tsx';

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

  const element = message ? (
    <MessageBox variant="danger" preformatted>
      {message}
    </MessageBox>
  ) : undefined;
  return [element, setError];
};
