import React from 'react';
import { startNewSearch } from 'actions';
import { connect } from 'react-redux';

/**
 * Creates a HOC that remembers the current editing condition and
 * starts a new search.
 */
const sendSearchCondition = opts => {
  const { nullCondition, searchName, resource, defaultSort } = opts;

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

      handleSearchClick = filter => {
        const { dispatch } = this.props;
        const { condition } = this.state;
        dispatch(
          startNewSearch(searchName, resource, filter, condition, defaultSort)
        );
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
            condition={this.state.condition}
            {...props}
          />
        );
      }
    }

    Enhanced.displayName = `searchPanel(${searchName})`;
    return connect(state => ({
      reloadCondition: state.searches[searchName]
        ? state.searches[searchName].condition
        : null
    }))(Enhanced);
  };
};

export default sendSearchCondition;
