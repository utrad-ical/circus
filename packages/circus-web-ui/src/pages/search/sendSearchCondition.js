import React, { useState, useEffect, useCallback } from 'react';
import { startNewSearch, savePreset } from 'actions';
import { useLoginManager } from 'utils/loginManager';
import { useApi } from 'utils/api';
import { useMappedState, useDispatch } from 'redux-react-hook';

const initialCondition = (state, searchName, presetName) => {
  const presetKey = searchName + 'SearchPresets';
  const presets = state.loginUser.data.preferences[presetKey];
  const matched = presets && presets.find(preset => preset.name === presetName);
  if (matched) return JSON.parse(matched.condition);
  if (state.searches[searchName]) return state.searches[searchName].condition;
  return undefined;
};

/**
 * Creates a HOC that remembers the current editing condition and
 * starts a new search.
 */
const sendSearchCondition = opts => {
  const {
    nullCondition,
    conditionToFilter,
    searchName,
    resource,
    defaultSort
  } = opts;

  return function (BaseComponent) {
    const Enhanced = props => {
      const { presetName } = props;
      const mapToState = useCallback(state => state, []);
      const state = useMappedState(mapToState);
      const [condition, setCondition] = useState(
        () => initialCondition(state, searchName, presetName) || nullCondition()
      );
      const loginManager = useLoginManager();
      const dispatch = useDispatch();
      const api = useApi();

      const handleChange = newCondition => {
        setCondition(newCondition);
      };

      const handleSearchClick = () => {
        dispatch(
          startNewSearch(
            api,
            searchName,
            resource,
            conditionToFilter(condition),
            condition,
            defaultSort
          )
        );
      };

      useEffect(handleSearchClick, []);

      const handleSavePresetClick = async () => {
        await dispatch(savePreset(api, searchName, condition));
        loginManager.refreshUserInfo(true);
      };

      const handleResetClick = () => {
        setCondition(nullCondition());
      };

      const { onChange, onSearchClick, onResetClick, ...rest } = props;
      return (
        <BaseComponent
          onChange={handleChange}
          onSearchClick={handleSearchClick}
          onResetClick={handleResetClick}
          onSavePresetClick={handleSavePresetClick}
          condition={condition}
          {...rest}
        />
      );
    };

    Enhanced.displayName = `searchPanel(${searchName})`;
    return Enhanced;
  };
};

export default sendSearchCondition;
