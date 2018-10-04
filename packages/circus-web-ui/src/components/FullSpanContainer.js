import React from 'react';
import { Helmet } from 'react-helmet';

/**
 * This adds "full-span-container" body class from within a component.
 */
const FullSpanContainer = props => {
  return (
    <div>
      <Helmet>
        <body className="full-span-container" />
      </Helmet>
      {props.children}
    </div>
  );
};

export default FullSpanContainer;
