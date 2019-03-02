import React, { useState, useEffect } from 'react';
import { startNewSearch, savePreset } from 'actions';
import { connect } from 'react-redux';
import { useApiManager } from 'utils/api';

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

  return function(BaseComponent) {
    const Enhanced = props => {
      const [condition, setCondition] = useState(props.initialCondition);
      const apiManager = useApiManager();
      const { dispatch } = props;

      const handleChange = newCondition => {
        setCondition(newCondition);
      };

      const handleSearchClick = () => {
        dispatch(
          startNewSearch(
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
        await dispatch(savePreset(searchName, condition));
        apiManager.refreshUserInfo(true);
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

    const mapStateToProps = (state, ownProps) => {
      const presetKey = searchName + 'SearchPresets';
      const presets = state.loginUser.data.preferences[presetKey];
      const matched =
        presets && presets.find(preset => preset.name === ownProps.presetName);
      if (matched) return { initialCondition: JSON.parse(matched.condition) };
      if (state.searches[searchName])
        return { initialCondition: state.searches[searchName].condition };
      return { initialCondition: nullCondition() };
    };

    return connect(mapStateToProps)(Enhanced);
  };
};

export default sendSearchCondition;
