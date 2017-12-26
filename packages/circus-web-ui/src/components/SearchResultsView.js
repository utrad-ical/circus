import React, { Fragment } from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { Pagination } from 'components/react-bootstrap';
import { changeSearchPage, changeSearchSort } from 'actions';
import LoadingIndicator from 'rb/LoadingIndicator';
import { connect } from 'react-redux';

export const makeSortOptions = sortKeys => {
  const options = {};
  Object.keys(sortKeys).forEach(k => {
    options[`{"${k}":-1}`] = `${sortKeys[k]} desc`;
    options[`{"${k}":1}`] = `${sortKeys[k]} asc`;
  });
  return options;
};

const SearchResultsView = props => {
  const {
    dispatch,
    search,
    name,
    sortOptions,
    dataView: DataView,
    active
  } = props;
  if (!search) return null;
  const { isFetching, totalItems, per, items, page, sort } = search;

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

  const pages = Math.ceil(totalItems / per);
  return (
    <div className="search-results-container">
      <div className="search-results-header">
        {totalItems + ' Result' + (totalItems > 1 ? 's' : '')}
        {sortOptions && (
          <Fragment>
            &emsp;Sort:&ensp;
            <ShrinkSelect
              options={sortOptions}
              value={sort}
              onChange={handleSortChange}
            />
          </Fragment>
        )}
      </div>
      <DataView value={items} active={active} />
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
        />
      </div>
    </div>
  );
};

export default connect((state, ownProps) => ({
  search: state.searches[ownProps.name]
}))(SearchResultsView);
