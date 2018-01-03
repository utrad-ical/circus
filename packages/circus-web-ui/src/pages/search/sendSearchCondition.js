import React from 'react';
import { startNewSearch, savePreset } from 'actions';
import { connect } from 'react-redux';
import { prompt } from 'rb/modal';

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
    class Enhanced extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          condition: props.reloadCondition
            ? props.reloadCondition
            : nullCondition()
        };
      }

      handleChange = newCondition => {
        this.setState({ condition: newCondition });
      };

      handleSearchClick = () => {
        const { dispatch } = this.props;
        const { condition } = this.state;
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

      handleSavePresetClick = async () => {
        const { dispatch } = this.props;
        const presetName = await prompt('Preset name');
        if (!presetName || !presetName.length) return;
        dispatch(savePreset(searchName, presetName, this.state.condition));
      };

      handleResetClick = () => {
        this.setState({ condition: nullCondition() });
      };

      render() {
        const { onChange, onSearchClick, onResetClick, ...props } = this.props;
        return (
          <BaseComponent
            onChange={this.handleChange}
            onSearchClick={this.handleSearchClick}
            onResetClick={this.handleResetClick}
            onSavePresetClick={this.handleSavePresetClick}
            condition={this.state.condition}
            {...props}
          />
        );
      }
    }

    Enhanced.displayName = `searchPanel(${searchName})`;

    const mapStateToProps = (state, ownProps) => {
      const presetKey = searchName + 'SearchPresets';
      const presets = state.loginUser.data.preferences[presetKey];
      const matched = presets.find(
        preset => preset.name === ownProps.presetName
      );
      if (matched) return { reloadCondition: JSON.parse(matched.condition) };
      if (state.searches[searchName])
        return { reloadCondition: state.searches[searchName].condition };
      return { reloadCondition: null };
    };

    return connect(mapStateToProps)(Enhanced);
  };
};

export default sendSearchCondition;
