import React, { useEffect, Fragment } from 'react';

/**
 * This adds "full-span-container" body class from within a component.
 */
const FullSpanContainer = props => {
  useEffect(() => {
    document.body.classList.add('full-span-container');
    return () => {
      document.body.classList.remove('full-span-container');
    };
  }, []);
  return <Fragment>{props.children}</Fragment>;
};

export default FullSpanContainer;
