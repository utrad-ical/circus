import React, { Fragment } from 'react';
import Select from '#components/Select.tsx';
import Pagination from '#components/Pagination.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import AutoReloadSwitch from './AutoReloadSwitch.tsx';
import Icon from '#components/Icon.tsx';
import classnames from 'classnames';
import { useApi } from '#utils/api.ts';
import { useSelector, useDispatch } from 'react-redux';
import * as searches from '#store/searches.ts';
import styles from './SearchResultsView.module.css';

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
    <div
      className={classnames(styles.searchResultsView, {
        [styles.busy]: isFetching
      })}
    >
      <div className={styles.header}>
        <div>{children}</div>
        <div>
          {totalItems + ' Result' + (totalItems !== 1 ? 's' : '')}
          &emsp;
          <Select
            size="small"
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
                size="small"
                onRefresh={handleRefresh}
                disabled={isFetching}
              />
            </Fragment>
          )}
          {sortOptions && (
            <Fragment>
              &emsp;
              <Icon icon="material-swap_vert" />
              &ensp;
              <Select
                size="small"
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
        <div className={styles.pager}>
          <Pagination
            pages={pages}
            activePage={page}
            onSelect={handlePageClick}
          />
        </div>
      )}
      <DataView
        value={items}
        selected={selected}
        onSelectionChange={handleSelectionChange}
        active={active}
      />
      {showPagenation && (
        <div className={styles.pager}>
          <Pagination
            pages={pages}
            activePage={page}
            onSelect={handlePageClick}
          />
        </div>
      )}
    </div>
  );
};

export default SearchResultsView;
