import React from 'react';
import { Button } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { ControlledCollapser } from 'components/Collapser';
import useLocalPreference from 'utils/useLocalPreference';

const StateSavingCollapser = props => {
  const [open, setOpen] = useLocalPreference('searchPanelOpen', false);
  return (
    <ControlledCollapser
      open={open}
      onToggleClick={() => setOpen(!open)}
      {...props}
    />
  );
};

const SearchPanel = props => {
  const { onResetClick, onSearchClick, onSavePresetClick, children } = props;
  return (
    <StateSavingCollapser title="Search Condition" framed>
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
    </StateSavingCollapser>
  );
};

export default SearchPanel;
