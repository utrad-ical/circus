import React, { useEffect } from 'react';
import AdminContainer from './AdminContainer';
import SearchResultsView from 'components/SearchResultsView';
import { startNewSearch } from 'actions';
import { connect } from 'react-redux';
import DataGrid from 'components/DataGrid';
import { useApi } from 'utils/api';

const columns = [
  { caption: 'Created', key: 'createdAt' },
  {
    caption: 'Data',
    className: 'data',
    renderer: props => JSON.stringify(props.value)
  }
];

const DataView = props => {
  const { value } = props;
  if (!value.length) {
    // return <div className="alert alert-info">No items in global queue.</div>;
  }
  return <DataGrid columns={columns} value={value} />;
};

const PluginJobQueueAdminView = props => {
  const { dispatch } = props;
  const api = useApi();

  useEffect(() => {
    dispatch(
      startNewSearch(
        api,
        'globalJobQueue',
        'admin/plugin-job-queue',
        {},
        {},
        { createdAt: -1 }
      )
    );
  }, [api, dispatch]);

  return (
    <AdminContainer title="Plugin Job Queue" icon="list">
      <SearchResultsView name="globalJobQueue" dataView={DataView} />
    </AdminContainer>
  );
};

const PluginJobQueueAdmin = connect()(PluginJobQueueAdminView);

export default PluginJobQueueAdmin;
