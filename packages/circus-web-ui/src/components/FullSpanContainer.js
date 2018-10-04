import React, { Fragment } from 'react';
import { Helmet } from 'react-helmet';

/**
 * This adds "full-span-container" body class from within a component.
 */
const FullSpanContainer = props => {
  return (
    <Fragment>
      <Helmet>
        <body className="full-span-container" />
      </Helmet>
      {props.children}
    </Fragment>
  );
};

export default FullSpanContainer;
