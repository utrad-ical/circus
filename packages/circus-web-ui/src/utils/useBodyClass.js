import { useEffect } from 'react';

/**
 * This adds the specified class to the `<body>` while the component is mounted.
 */
const useBodyClass = bodyClass => {
  useEffect(() => {
    document.body.classList.add(bodyClass);
    return () => {
      document.body.classList.remove(bodyClass);
    };
  }, [bodyClass]);
};

export default useBodyClass;
