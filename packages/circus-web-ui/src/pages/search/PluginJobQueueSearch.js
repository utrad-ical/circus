import React from 'react';
import Icon from 'components/Icon';
import { startNewSearch } from 'actions';
import PluginJobQueueSearchResults from './PluginJobQueueSearchResults';
import { connect } from 'react-redux';

class PluginJobQueueSearch extends React.Component {
  componentDidMount() {
    const { startNewSearch } = this.props;
    startNewSearch('pluingJobQueue', 'plugin-job-queue', {}, {}, { jobId: -1 });
  }

  render() {
    return (
      <div>
        <h1>
          <Icon icon="circus-case" /> Plug-in Job Queue
        </h1>
        <PluginJobQueueSearchResults />
      </div>
    );
  }
}

export default connect(null, dispatch => ({
  startNewSearch: (...args) => dispatch(startNewSearch(...args))
}))(PluginJobQueueSearch);
