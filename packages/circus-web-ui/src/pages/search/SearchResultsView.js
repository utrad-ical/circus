import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { Pagination } from 'components/react-bootstrap';
import { changeSearchPage, changeSearchSort } from 'actions';

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
    name,
    totalItems,
    per,
    items,
    page,
    sort,
    sortOptions,
    dataView: DataView
  } = props;

  function handleSortChange(newSort) {
    if (newSort === sort) return;
    dispatch(changeSearchSort(name, newSort));
  }

  function handlePageClick(newPage) {
    if (newPage === page) return;
    dispatch(changeSearchPage(name, newPage));
  }

  const pages = Math.ceil(totalItems / per);
  if (!Array.isArray(items)) return null;
  return (
    <div className="search-results-container">
      <div className="search-results-header">
        {totalItems + ' Result' + (totalItems > 1 ? 's' : '')}
        &emsp;Sort:&ensp;
        <ShrinkSelect
          options={sortOptions}
          value={sort}
          onChange={handleSortChange}
        />
      </div>
      {<DataView items={items} />}
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

export default SearchResultsView;
