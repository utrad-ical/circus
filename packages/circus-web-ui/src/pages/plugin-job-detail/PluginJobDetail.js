import React from 'react';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import { api } from 'utils/api';
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
  const { job, seriesData } = props;
  const primarySeriesUid = job.series[0].seriesUid;
  return (
    <FullSpanContainer>
      <div className="job-detail-header">
        <PluginDisplay pluginId={job.pluginId} size="xl" />
        <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
      </div>
      <div className="job-detail-main">
        <FeedbackSwitcher {...props} />
      </div>
    </FullSpanContainer>
  );
};

class ConnectedPluginJobDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = { job: null };
  }

  async componentDidMount() {
    const jobId = this.props.match.params.jobId;

    try {
      const job = await api(`plugin-jobs/${jobId}`);
      const seriesData = {};
      for (const s of job.series) {
        const seriesUid = s.seriesUid;
        if (seriesUid in seriesData) continue;
        seriesData[seriesUid] = await api(`series/${seriesUid}`);
      }
      this.setState({ job, seriesData });
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
