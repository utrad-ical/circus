import React from 'react';
import { Button } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { CollapserView } from 'components/Collapser';
import withPreference from 'components/withPreference';

const StateSavingCollapser = withPreference('searchPanelOpen', true)(props => {
  const {
    searchPanelOpen,
    searchPanelOpenChange,
    searchPanelOpenBusy,
    ...rest
  } = props;
  return (
    <CollapserView
      open={props.searchPanelOpen}
      onToggleClick={() => props.searchPanelOpenChange(!props.searchPanelOpen)}
      {...rest}
    />
  );
});

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
