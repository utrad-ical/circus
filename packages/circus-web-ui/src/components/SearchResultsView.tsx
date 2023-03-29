import React, { Fragment } from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { Pagination } from 'components/react-bootstrap';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import AutoReloadSwitch from './AutoReloadSwitch';
import Icon from 'components/Icon';
import classnames from 'classnames';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { useSelector, useDispatch } from 'react-redux';
import * as searches from 'store/searches';

export const patientInfoSearchOptions: { readonly [key: string]: string } = {
  'patientInfo.patientName': 'patient name',
  'patientInfo.patientId': 'patient ID',
  'patientInfo.age': 'patient age'
};

export const makeSortOptions = (sortKeys: { [key: string]: string }) => {
  const options: { [key: string]: string } = {};
  Object.keys(sortKeys).forEach(k => {
    options[`{"${k}":-1}`] = `${sortKeys[k]} desc`;
    options[`{"${k}":1}`] = `${sortKeys[k]} asc`;
  });
  return options;
};

const limitOptions = [10, 20, 50, 100, 200].map(String);

const ItemsPerPageOptionRenderer: React.FC<{ caption: number }> = props => (
  <Fragment>{props.caption} items</Fragment>
);

const ResultPagination: React.FC<{
  onSelect: (selected: number) => void;
  disabled?: boolean;
  activePage: number;
  pages: number;
}> = props => {
  const { onSelect, disabled, activePage, pages } = props;
  const firstItem = Math.max(1, activePage - 2);
  const lastItem = Math.min(pages, activePage + 2);
  const pageItems = [];
  const handleClick = (selected: number) => {
    if (selected >= 1 && selected <= pages && selected !== activePage) {
      onSelect(selected);
    }
  };
  for (let i = firstItem; i <= lastItem; i++) pageItems.push(i);
  return (
    <div className="search-results-pager">
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
    </div>
  );
};

const StyledDiv = styled.div`
  .search-results-header {
    display: flex;
    justify-content: space-between;
    margin: 0.5em 0 0.3em;
  }

  .search-results-pager {
    text-align: center;
  }

  &.busy {
    opacity: 0.7;
  }
`;

/**
 * SearchResults displays the search results along with pager and sort changer.
 */
const SearchResultsView: React.FC<{
  name: string;
  sortOptions?: any;
  dataView: React.FC<{
    value: any[];
    selected: string[];
    onSelectionChange: (id: string, isSelected: boolean) => void;
    active: any;
  }>;
  active?: any;
  refreshable?: boolean;
}> = props => {
  const {
    name,
    sortOptions,
    dataView: DataView,
    active,
    refreshable,
    children
  } = props;

  const api = useApi();
  const dispatch = useDispatch();
  const search = useSelector(state => state.searches.searches[name]);
  const dic = useSelector(state => {
    if (!search) return undefined;
    const resourceType =
      search.params.resource.resourceType ?? search.params.resource.endPoint;
    return state.searches.items[resourceType];
  });

  if (!search) return null;

  const {
    isFetching,
    params: { limit, page, sort },
    results
  } = search;

  if (isFetching && !dic) return <LoadingIndicator delay={1000} />;

  if (!dic || !results) return null; // Should not happen

  const { indexes, totalItems } = results;
  const items = indexes.map(index => dic[index]);
  const selected = search.selected;

  const handleSortChange = (newSort: string) => {
    if (newSort === sort) return;
    dispatch(searches.updateSearch(api, name, { sort: newSort }));
  };

  const handlePageClick = (newPage: number) => {
    if (newPage === page) return;
    dispatch(searches.updateSearch(api, name, { page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    if (newLimit === limit) return;
    dispatch(searches.updateSearch(api, name, { limit: newLimit }));
  };

  const handleRefresh = () => {
    if (isFetching) return;
    dispatch(searches.updateSearch(api, name, {}));
  };

  const handleSelectionChange = (id: string, isSelected: boolean) => {
    dispatch(
      searches.selectionStatusChanged({ searchName: name, id, isSelected })
    );
  };

  const pages = Math.ceil(totalItems / limit);
  const showPagenation = pages >= 2 || page >= 2;
  return (
    <StyledDiv className={classnames({ busy: isFetching })}>
      <div className="search-results-header">
        <div>{children}</div>
        <div>
          {totalItems + ' Result' + (totalItems !== 1 ? 's' : '')}
          &emsp;
          <ShrinkSelect
            bsSize="sm"
            options={limitOptions}
            value={limit}
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
              <Icon icon="sort" />
              &ensp;
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
      </div>
      {showPagenation && (
        <ResultPagination
          pages={pages}
          activePage={page}
          onSelect={handlePageClick}
          disabled={isFetching}
        />
      )}
      <DataView
        value={items}
        selected={selected}
        onSelectionChange={handleSelectionChange}
        active={active}
      />
      {showPagenation && (
        <ResultPagination
          pages={pages}
          activePage={page}
          onSelect={handlePageClick}
          disabled={isFetching}
        />
      )}
    </StyledDiv>
  );
};

export default SearchResultsView;
