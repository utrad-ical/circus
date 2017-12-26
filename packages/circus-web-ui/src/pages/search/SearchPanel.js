import React from 'react';
import { Button, Well } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';

const SearchPanel = props => {
  const { onResetClick, onSearchClick, children } = props;
  return (
    <Well>
      {children}
      <div className="search-buttons">
        <Button bsStyle="link" onClick={onResetClick}>
          Reset
        </Button>
        &ensp;
        <IconButton bsStyle="primary" icon="search" onClick={onSearchClick}>
          Search
        </IconButton>
      </div>
    </Well>
  );
};

export default SearchPanel;
