import React, { Fragment } from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { Pagination } from './react-bootstrap';
import {
  changeSearchPage,
  changeSearchSort,
  changeSearchLimit,
  refreshSearch
} from 'shared/actions';
import LoadingIndicator from 'rb/LoadingIndicator';
import { connect } from 'react-redux';
import AutoReloadSwitch from './AutoReloadSwitch';
import Icon from './Icon';

export const makeSortOptions = sortKeys => {
  const options = {};
  Object.keys(sortKeys).forEach(k => {
    options[`{"${k}":-1}`] = `${sortKeys[k]} desc`;
    options[`{"${k}":1}`] = `${sortKeys[k]} asc`;
  });
  return options;
};

const limitOptions = [10, 20, 50, 100, 200];

const ItemsPerPageOptionRenderer = props => (
  <Fragment>{props.caption} items</Fragment>
);

/**
 * SearchResultsView is connected to `search` redux state and
 * displays the search results along with pager and sort changer.
 */
const SearchResultsView = props => {
  const {
    dispatch,
    search,
    name,
    sortOptions,
    dataView: DataView,
    active,
    refreshable,
    ...rest
  } = props;
  if (!search) return null;
  const { isFetching, totalItems, limit, items, page, sort } = search;

  if (isFetching && !Array.isArray(items))
    return <LoadingIndicator delay={1000} />;

  if (!Array.isArray(items)) return null; // This should not happen

  function handleSortChange(newSort) {
    if (newSort === sort) return;
    dispatch(changeSearchSort(name, newSort));
  }

  function handlePageClick(newPage) {
    if (newPage === page) return;
    dispatch(changeSearchPage(name, newPage));
  }

  function handleLimitChange(newLimit) {
    if (newLimit === limit) return;
    dispatch(changeSearchLimit(name, newLimit));
  }

  function handleRefresh() {
    if (isFetching) return;
    dispatch(refreshSearch(name));
  }

  const pages = Math.ceil(totalItems / limit);
  return (
    <div className="search-results-container">
      <div className="search-results-header">
        {totalItems + ' Result' + (totalItems > 1 ? 's' : '')}
        &emsp;
        <ShrinkSelect
          bsSize="sm"
          options={limitOptions}
          value={limit + ''}
          onChange={handleLimitChange}
          disabled={isFetching}
          renderer={ItemsPerPageOptionRenderer}
          numericalValue
        />
        {refreshable && (
          <Fragment>
            &emsp;
            <AutoReloadSwitch
              bsSize="sm"
              onRefresh={handleRefresh}
              disabled={isFetching}
            />
          </Fragment>
        )}
        {sortOptions && (
          <Fragment>
            &emsp;
            <Icon icon="sort" />&ensp;
            <ShrinkSelect
              bsSize="sm"
              options={sortOptions}
              value={sort}
              onChange={handleSortChange}
              disabled={isFetching}
            />
          </Fragment>
        )}
      </div>
      <DataView value={items} active={active} {...rest} />
      <div className="search-results-pager">
        <Pagination
          prev
          next
          first
          last
          ellipsis
          items={pages}
          maxButtons={10}
          activePage={page}
          onSelect={handlePageClick}
          disabled={isFetching}
        />
      </div>
    </div>
  );
};

export default connect((state, ownProps) => ({
  search: state.searches[ownProps.name]
}))(SearchResultsView);
