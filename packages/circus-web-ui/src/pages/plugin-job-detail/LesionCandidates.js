import React from 'react';
import ImageViewer from 'components/ImageViewer';
import * as rs from 'circus-rs';
import { connect } from 'react-redux';

const Candidate = props => {
  const {
    value,
    index,
    onFeedbackChange,
    feedbackListener: FeedbackListener,
    feedback,
    composition
  } = props;
  return (
    <div className="lesion-candidate">
      <div>Rank: {value.rank}</div>
      <div>
        Loc: [{value.location_z}, {value.location_y}, {value.location_z}]
      </div>
      <div>Confidence: {value.confidence}</div>
      <ImageViewer
        className="lesion-candidate-viewer"
        composition={composition}
        tool="pager"
        initialTool="pager"
      />
      <div className="lesion-candidate-feedback-listener">
        <FeedbackListener
          value={feedback}
          options={['TP', 'FP', 'pending']}
          onChange={val => onFeedbackChange(index, val)}
        />
      </div>
    </div>
  );
};

class LesionCandidatesView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { compositoin: null };
  }

  async componentDidMount() {
    const { user, job } = this.props;
    const seriesUid = job.series[0].seriesUid;
    const server = user.data.dicomImageServer;
    const client = new rs.RsHttpClient(server);
    const src = new rs.HybridImageSource({ client, series: seriesUid });
    const composition = new rs.Composition(src);
    this.setState({ composition });
  }

  handleFeedbackChange = (index, selected) => {
    const { onFeedbackChange, feedback } = this.props;
    const newFeedback = feedback.slice();
    newFeedback[index] = selected;
    onFeedbackChange(newFeedback);
  };

  render() {
    const { value, feedbackListener, feedback } = this.props;
    return (
      <div className="lesion-candidates">
        {value.map((cand, i) => (
          <Candidate
            key={i}
            value={cand}
            feedbackListener={feedbackListener}
            feedback={feedback[i]}
            index={i}
            onFeedbackChange={this.handleFeedbackChange}
            composition={this.state.composition}
          />
        ))}
      </div>
    );
  }
}

const LesionCandidates = connect(state => ({ user: state.loginUser }))(
  LesionCandidatesView
);

export default LesionCandidates;
