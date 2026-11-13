import Alert from '#components/Alert.tsx';
import React, { useEffect } from 'react';
import AdminContainer from './AdminContainer.tsx';
import SearchResultsView from '#components/SearchResultsView.tsx';
import { newSearch } from '#store/searches.ts';
import { useDispatch } from 'react-redux';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import { useApi } from '#utils/api.ts';

const columns: DataGridColumnDefinition[] = [
  { caption: 'Created', key: 'createdAt' },
  {
    caption: 'Data',
    className: 'data',
    renderer: props => <>{JSON.stringify(props.value)}</>
  }
];

const DataView: React.FC<{ value: any }> = props => {
  const { value } = props;
  if (!value.length) {
    return <Alert variant="info">No items in global queue.</Alert>;
  }
  return <DataGrid columns={columns} itemPrimaryKey="jobId" value={value} />;
};

const PluginJobQueueAdmin: React.FC<{}> = props => {
  const api = useApi();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      newSearch(api, 'globalJobQueue', {
        resource: { endPoint: 'admin/plugin-job-queue', primaryKey: 'jobId' },
        filter: {},
        condition: {},
        sort: '{ createdAt: -1 }'
      })
    );
  }, [api, dispatch]);

  return (
    <AdminContainer title="Plugin Job Queue" icon="material-pending_actions">
      <SearchResultsView name="globalJobQueue" dataView={DataView} />
    </AdminContainer>
  );
};

export default PluginJobQueueAdmin;
