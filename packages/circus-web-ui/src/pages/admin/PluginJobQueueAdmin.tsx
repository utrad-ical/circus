import React, { useEffect } from 'react';
import AdminContainer from './AdminContainer';
import SearchResultsView from 'components/SearchResultsView';
import { newSearch } from 'store/searches';
import { useDispatch } from 'react-redux';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import { useApi } from 'utils/api';

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
    return <div className="alert alert-info">No items in global queue.</div>;
  }
  return <DataGrid columns={columns} value={value} />;
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
    <AdminContainer title="Plugin Job Queue" icon="list">
      <SearchResultsView name="globalJobQueue" dataView={DataView} />
    </AdminContainer>
  );
};

export default PluginJobQueueAdmin;
