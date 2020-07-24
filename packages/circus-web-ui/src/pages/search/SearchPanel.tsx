import React, { useState, useCallback, useEffect } from 'react';
import { Button } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { ControlledCollapser } from 'components/Collapser';
import useLocalPreference from 'utils/useLocalPreference';
import { useApi } from 'utils/api';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginManager } from 'utils/loginManager';
import useLoginUser from 'utils/useLoginUser';
import { SearchPreset } from 'store/loginUser';
import * as searches from 'store/searches';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

const StateSavingCollapser: React.FC<any> = props => {
  const [open, setOpen] = useLocalPreference('searchPanelOpen', false);
  return (
    <ControlledCollapser
      open={open}
      onToggleClick={() => setOpen(!open)}
      {...props}
    />
  );
};

const ButtonBar = styled.div`
  text-align: center;
  margin-top: 1em;
`;

const SearchPanel: <T extends {}>(props: {
  nullCondition: () => T;
  conditionToFilter: (condition: T) => any;
  conditionEditor: React.ComponentType<{
    value: T;
    onChange: (value: T) => void;
  }>;
  searchName: string;
  presetName?: string;
  resource: searches.SearchResource;
  defaultSort: string;
}) => React.ReactElement<any> = props => {
  const {
    searchName,
    resource,
    defaultSort,
    conditionToFilter,
    nullCondition,
    conditionEditor: ConditionEditor
  } = props;

  const presetName = useParams<any>().presetName as string | undefined;
  const user = useLoginUser()!;
  const api = useApi();
  const dispatch = useDispatch();
  const loginManager = useLoginManager();
  const search = useSelector(state => state.searches[searchName]);

  const [condition, setCondition] = useState(() => {
    // Determine initial condition
    const presetKey = searchName + 'SearchPresets';
    if (presetName) {
      // Use preset condition
      const presets =
        ((user.preferences as any)[presetKey] as SearchPreset[]) ?? [];
      const matched = presets.find(preset => preset.name === presetName);
      if (matched) {
        return JSON.parse(matched.condition);
      }
    }
    if (search) {
      // Use the saved condition of the existing search
      return search.params.condition;
    }
    return nullCondition();
  });

  const handleResetClick = useCallback(() => {
    setCondition(nullCondition());
  }, [nullCondition]);

  const handleSearchClick = useCallback(() => {
    dispatch(
      searches.newSearch(api, searchName, {
        resource,
        condition,
        filter: conditionToFilter(condition),
        sort: defaultSort
      })
    );
  }, [
    api,
    condition,
    conditionToFilter,
    defaultSort,
    dispatch,
    resource,
    searchName
  ]);

  // The following is invoked only on first-time render
  // eslint-disable-next-line
  useEffect(handleSearchClick, []);

  const handleSavePresetClick = useCallback(async () => {
    await dispatch(searches.savePreset(api, searchName, condition));
    loginManager.refreshUserInfo(true);
  }, [api, condition, dispatch, loginManager, searchName]);

  return (
    <StateSavingCollapser title="Search Condition" framed>
      <ConditionEditor value={condition} onChange={setCondition} />
      <ButtonBar>
        <IconButton bsStyle="link" icon="save" onClick={handleSavePresetClick}>
          Save
        </IconButton>
        &ensp;
        <Button bsStyle="link" onClick={handleResetClick}>
          Reset
        </Button>
        &ensp;
        <IconButton bsStyle="primary" icon="search" onClick={handleSearchClick}>
          Search
        </IconButton>
      </ButtonBar>
    </StateSavingCollapser>
  );
};

export default SearchPanel;
