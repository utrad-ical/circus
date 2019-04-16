import React, { Fragment, useCallback } from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { Pagination } from 'components/react-bootstrap';
import {
  changeSearchPage,
  changeSearchSort,
  changeSearchLimit,
  refreshSearch
} from 'actions';
import LoadingIndicator from 'rb/LoadingIndicator';
import AutoReloadSwitch from './AutoReloadSwitch';
import Icon from 'components/Icon';
import classnames from 'classnames';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { useMappedState, useDispatch } from 'redux-react-hook';

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

const ResultPagination = props => {
  const { onSelect, disabled, activePage, pages } = props;
  const firstItem = Math.max(1, activePage - 2);
  const lastItem = Math.min(pages, activePage + 2);
  const pageItems = [];
  const handleClick = selected => {
    if (
      typeof onSelect === 'function' &&
      selected >= 1 &&
      selected <= pages &&
      selected !== activePage
    ) {
      onSelect(selected);
    }
  };
  for (let i = firstItem; i <= lastItem; i++) pageItems.push(i);
  return (
    <Pagination disabled={disabled || pages <= 0 || true}>
      <Pagination.First
        onClick={() => handleClick(1)}
        disabled={activePage == 1}
      />
      <Pagination.Prev
        onClick={() => handleClick(activePage - 1)}
        disabled={activePage == 1}
      />
      {pageItems.map(i => (
        <Pagination.Item
          key={i}
          active={i == activePage}
          onClick={() => handleClick(i)}
        >
          {i}
        </Pagination.Item>
      ))}
      <Pagination.Next
        onClick={() => handleClick(activePage + 1)}
        disabled={pages <= 0 || activePage == pages}
      />
      <Pagination.Last
        onClick={() => handleClick(pages)}
        disabled={pages <= 0 || activePage == pages}
      />
    </Pagination>
  );
};

const StyledDiv = styled.div`
  .search-results-header {
    text-align: right;
    margin: 0.5em 0 0.3em;
  }

  .search-results-pager {
    text-align: center;
  }

  .table.data-grid {
    tbody tr td {
      vertical-align: middle;
    }
    border-bottom: 2px solid #ddd;
  }

  &.busy {
    opacity: 0.7;
  }
`;

/**
 * SearchResultsView is connected to `search` redux state and
 * displays the search results along with pager and sort changer.
 */
const SearchResults = props => {
  const {
    name,
    sortOptions,
    dataView: DataView,
    active,
    refreshable,
    ...rest
  } = props;

  const api = useApi();
  const mapState = useCallback(state => state.searches[name], [name]);
  const dispatch = useDispatch();

  const search = useMappedState(mapState);
  if (!search) return null;
  const { isFetching, totalItems, limit, items, page, sort } = search;

  if (isFetching && !Array.isArray(items))
    return <LoadingIndicator delay={1000} />;

  if (!Array.isArray(items)) return null; // This should not happen

  const handleSortChange = newSort => {
    if (newSort === sort) return;
    dispatch(changeSearchSort(api, name, newSort));
  };

  const handlePageClick = newPage => {
    if (newPage === page) return;
    dispatch(changeSearchPage(api, name, newPage));
  };

  const handleLimitChange = newLimit => {
    if (newLimit === limit) return;
    dispatch(changeSearchLimit(api, name, newLimit));
  };

  const handleRefresh = () => {
    if (isFetching) return;
    dispatch(refreshSearch(api, name));
  };

  const pages = Math.ceil(totalItems / limit);
  return (
    <StyledDiv className={classnames({ busy: isFetching })}>
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
        <ResultPagination
          pages={pages}
          activePage={page}
          onSelect={handlePageClick}
          disabled={isFetching}
        />
      </div>
    </StyledDiv>
  );
};

export default SearchResults;
