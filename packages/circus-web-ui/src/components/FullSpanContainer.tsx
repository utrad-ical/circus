import React, { Fragment } from 'react';
import useBodyClass from 'utils/useBodyClass';

/**
 * This adds "full-span-container" body class from within a component.
 */
const FullSpanContainer: React.FC = props => {
  useBodyClass('full-span-container');
  return <Fragment>{props.children}</Fragment>;
};

export default FullSpanContainer;
