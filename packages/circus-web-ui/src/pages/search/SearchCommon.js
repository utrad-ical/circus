import React from 'react';
import { startNewSearch } from 'actions';
import { store } from 'store';
import Icon from 'components/Icon';
import { connect } from 'react-redux';

/**
 * Composes search condition box and search result pane.
 */
class SearchCommonBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      condition: props.reloadCondition
        ? props.reloadCondition
        : props.nullCondition()
    };
    this.handleConditionChange = this.handleConditionChange.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleResetClick = this.handleResetClick.bind(this);
  }

  handleConditionChange(newCondition) {
    this.setState({ condition: newCondition });
  }

  handleSearch({ filter, condition }) {
    const { searchName, resource, defaultSort } = this.props;
    store.dispatch(
      startNewSearch(searchName, resource, filter, condition, defaultSort)
    );
  }

  handleResetClick() {
    const { nullCondition } = this.props;
    this.setState({ condition: nullCondition() });
  }

  render() {
    const {
      icon,
      title,
      nullCondition,
      conditionComp: ConditionComp,
      resultComp: ResultComp
    } = this.props;
    return (
      <div>
        <h1>
          <Icon icon={icon} />&ensp;{title}
        </h1>
        <ConditionComp
          condition={this.state.condition}
          nullCondition={nullCondition}
          onSearch={this.handleSearch}
          onChange={this.handleConditionChange}
          onResetClick={this.handleResetClick}
        />
        <ResultComp />
      </div>
    );
  }
}

const SearchCommon = connect((state, ownProps) => ({
  reloadCondition: state.searches[ownProps.searchName]
    ? state.searches[ownProps.searchName].condition
    : null
}))(SearchCommonBase);

export default SearchCommon;
