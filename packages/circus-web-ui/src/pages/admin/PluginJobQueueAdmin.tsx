import type { PluginJob } from '@utrad-ical/circus-api-schema';
import Alert from '#components/Alert.tsx';
import React, { useEffect } from 'react';
import AdminContainer from './AdminContainer.tsx';
import SearchResultsView from '#components/SearchResultsView.tsx';
import { newSearch } from '#store/searches.ts';
import { useDispatch } from 'react-redux';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import {
  Executer,
  JobId,
  PluginRenderer,
  Status,
  Times
} from '#pages/search/SearchResultRenderer.tsx';

const columns: DataGridColumnDefinition<PluginJob>[] = [
  { caption: 'Plugin', renderer: PluginRenderer() },
  { caption: 'Job ID', renderer: JobId },
  { caption: 'Executed by', renderer: Executer },
  { caption: 'Registered', renderer: Times('createdAt') },
  { caption: 'Status', renderer: Status }
];

const DataView: React.FC<{ value: PluginJob[] }> = props => {
  const { value } = props;
  if (!value.length) {
    return <Alert variant="info">No items in global queue.</Alert>;
  }
  return <DataGrid columns={columns} itemPrimaryKey="jobId" value={value} />;
};

const PluginJobQueueAdmin: React.FC<{}> = props => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      newSearch('globalJobQueue', {
        resource: { endPoint: 'admin/plugin-job-queue', primaryKey: 'jobId' },
        filter: {},
        condition: {},
        sort: '{ createdAt: -1 }'
      })
    );
  }, [dispatch]);

  return (
    <AdminContainer title="Plugin Job Queue" icon="material-pending_actions">
      <SearchResultsView name="globalJobQueue" dataView={DataView} />
    </AdminContainer>
  );
};

export default PluginJobQueueAdmin;
