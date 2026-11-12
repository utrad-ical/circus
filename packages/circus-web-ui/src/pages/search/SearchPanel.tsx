import Button from '#components/Button.tsx';
import React, { useState, useCallback, useEffect } from 'react';
import { ControlledCollapser } from '#components/Collapser.tsx';
import useLocalPreference from '#utils/useLocalPreference.ts';
import { useApi } from '#utils/api.ts';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginManager } from '#utils/loginManager.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import type { SearchPreset } from '#store/loginUser.ts';
import * as searches from '#store/searches.ts';
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
  const search = useSelector(state => state.searches.searches[searchName]);

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
        sort: search?.params?.sort ?? defaultSort,
        ...(search?.params?.limit > 0 ? { limit: search.params.limit } : {}),
        page: 1
      })
    );
  }, [
    api,
    condition,
    conditionToFilter,
    defaultSort,
    dispatch,
    resource,
    search,
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
        <Button
          variant="link"
          icon="material-download_2"
          onClick={handleSavePresetClick}
        >
          Save
        </Button>
        &ensp;
        <Button variant="link" onClick={handleResetClick}>
          Reset
        </Button>
        &ensp;
        <Button
          variant="primary"
          icon="material-search"
          onClick={handleSearchClick}
        >
          Search
        </Button>
      </ButtonBar>
    </StateSavingCollapser>
  );
};

export default SearchPanel;
