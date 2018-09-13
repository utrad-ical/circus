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
        value={job.result.lesionCandidates}
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
    // const { jobId } = this.props;
    // const job = await api(`plugin-job/${jobId}`);

    const job = {
      jobId: 'aaabbbccc',
      pluginId: 'pluginid',
      status: 'finished',
      userEmail: 'circus@circus.example.com',
      series: [
        {
          seriesUid: (await api('series', { params: { limit: 1 } })).items[0]
            .seriesUid,
          start: 1,
          end: 150,
          delta: 1
        }
      ],
      result: {
        lesionCandidates: [
          {
            rank: 1,
            location_x: 10,
            location_y: 20,
            location_z: 20,
            confidence: 0.9
          },
          {
            rank: 2,
            location_x: 10,
            location_y: 20,
            location_z: 40,
            confidence: 0.8
          },
          {
            rank: 3,
            location_x: 10,
            location_y: 20,
            location_z: 50,
            confidence: 0.7
          }
        ]
      },
      feedback: [],
      startedAt: new Date('2018-03-03T11:01:00Z'),
      finishedAt: new Date('2018-03-03T11:02:00Z'),
      createdAt: new Date('2018-03-03T11:00:30Z'),
      updatedAt: new Date('2018-03-03T15:15:15Z')
    };
    const seriesData = {};
    for (const s of job.series) {
      const seriesUid = s.seriesUid;
      if (seriesUid in seriesData) continue;
      seriesData[seriesUid] = await api(`series/${seriesUid}`);
    }

    const plugin = await api(`plugins/${job.pluginId}`);

    this.setState({ job, seriesData, plugin });
  }

  render() {
    if (this.state.job) {
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
