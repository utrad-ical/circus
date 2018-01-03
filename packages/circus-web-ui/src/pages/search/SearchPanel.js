import React from 'react';
import { Button, Well } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';

const SearchPanel = props => {
  const { onResetClick, onSearchClick, onSavePresetClick, children } = props;
  return (
    <Well>
      {children}
      <div className="search-buttons">
        <IconButton bsStyle="link" icon="save" onClick={onSavePresetClick}>
          Save
        </IconButton>
        &ensp;
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
