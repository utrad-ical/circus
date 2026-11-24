import type { PluginJob } from '@utrad-ical/circus-api-schema';
import React, { useEffect } from 'react';
import DataGrid, {
  type DataGridColumnDefinition
} from '#components/DataGrid.tsx';
import Icon from '#components/Icon.tsx';
import {
  JobId,
  PluginRenderer,
  Status,
  Times
} from './SearchResultRenderer.tsx';
import { newSearch } from '#store/searches.ts';
import { useAppDispatch } from '#store/index.ts';
import SearchResultsView, {
  makeSortOptions
} from '#components/SearchResultsView.tsx';

const sortOptions = makeSortOptions({
  jobId: 'job id'
});

const columns: DataGridColumnDefinition<PluginJob>[] = [
  { caption: 'Plugin', renderer: PluginRenderer() },
  { caption: 'Job ID', renderer: JobId },
  { caption: 'Registered', renderer: Times('createdAt') },
  { caption: 'Status', renderer: Status }
];

const DataView: React.FC<{ value: PluginJob[] }> = props => {
  const { value } = props;
  if (!value.length) {
    return <div>No plug-in job in execution queue.</div>;
  }
  return <DataGrid columns={columns} itemPrimaryKey="jobId" value={value} />;
};

const PluginJobQueueSearchResults: React.FC<{}> = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="pluingJobQueue"
    />
  );
};

const PluginJobQueueSearch: React.FC<{}> = props => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      newSearch('pluingJobQueue', {
        resource: { endPoint: 'plugin-job-queue', primaryKey: 'jobId' },
        condition: {},
        filter: {},
        sort: '{"jobId":-1}'
      })
    );
  }, [dispatch]);

  return (
    <div>
      <h1>
        <Icon icon="circus-case" /> Plug-in Job Queue
      </h1>
      <PluginJobQueueSearchResults />
    </div>
  );
};

export default PluginJobQueueSearch;
