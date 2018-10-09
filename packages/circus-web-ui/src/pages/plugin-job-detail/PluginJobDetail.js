import React from 'react';
import PatientInfoBox from 'components/PatientInfoBox';
import { api } from '../../utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import LesionCandidates from './LesionCandidates';
import PluginDisplay from 'components/PluginDisplay';
import SelectionFeedbackListener from './feedback-listener/SelectionFeedbackListener';
import FeedbackSwitcher from './FeedbackSwitcher';
import { connect } from 'react-redux';

const PluginJobDetailView = props => {
  const { job, onFeedbackChange, feedback } = props;
  return (
    <div>
      <LesionCandidates
        job={job}
        value={job.results.results.lesionCandidates}
        feedbackListener={SelectionFeedbackListener}
        feedback={feedback}
        onFeedbackChange={onFeedbackChange}
      />
    </div>
  );
};

const PluginJobDetailPage = props => {
  const { job, seriesData, plugin } = props;
  const primarySeriesUid = job.series[0].seriesUid;
  return (
    <div>
      <div className="job-detail-header">
        <PluginDisplay plugin={plugin} size="lg" withName />
        <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
      </div>
      <FeedbackSwitcher {...props} />
    </div>
  );
};

class ConnectedPluginJobDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = { job: null };
  }

  async componentDidMount() {
    const jobId = this.props.match.params.jobId;
    const job = await api(`plugin-jobs/${jobId}`);
    const seriesData = {};
    for (const s of job.series) {
      const seriesUid = s.seriesUid;
      if (seriesUid in seriesData) continue;
      seriesData[seriesUid] = await api(`series/${seriesUid}`);
    }

    try {
      // const plugin = await api(`plugins/${job.pluginId}`);
      const plugin = {
        pluginId: 'pluginid',
        name: 'mra-cad',
        version: '1.0.5',
        description: 'Detects aneurysms.',
        icon: {
          glyph: 'brain',
          color: '#ffeeee',
          backgroundColor: '#333333'
        }
      };
      this.setState({ job, seriesData, plugin });
    } catch (e) {
      this.setState({ errorMessage: e.message });
    }
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="alert alert-danger">{this.state.errorMessage}</div>
      );
    } else if (this.state.job) {
      return (
        <PluginJobDetailPage
          jobRenderer={PluginJobDetailView}
          job={this.state.job}
          seriesData={this.state.seriesData}
          plugin={this.state.plugin}
        />
      );
    } else {
      return <LoadingIndicator />;
    }
  }
}

const PluginJobDetail = connect(state => ({ user: state.loginUser.data }))(
  ConnectedPluginJobDetail
);

export default PluginJobDetail;
