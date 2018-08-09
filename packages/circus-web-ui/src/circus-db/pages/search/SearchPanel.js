import React from 'react';
import { Button } from '../../components/react-bootstrap';
import IconButton from '../../components/IconButton';
import Collapser from '../../components/Collapser';

const SearchPanel = props => {
  const { onResetClick, onSearchClick, onSavePresetClick, children } = props;
  return (
    <Collapser title="Search Condition" framed>
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
    </Collapser>
  );
};

export default SearchPanel;
