import React from 'react';
import ImageViewer from 'components/ImageViewer';
import styled from 'styled-components';
import * as rs from 'circus-rs';
import { connect } from 'react-redux';
import EventEmitter from 'events';

class Candidate extends React.PureComponent {
  constructor(props) {
    super(props);
    this.stateChanger = new EventEmitter();
  }

  handleReady = () => {
    const { composition, value } = this.props;
    const vs = composition.imageSource.metadata.voxelSize;
    this.stateChanger.emit('change', state => {
      const newOrigin = [
        state.section.origin[0],
        state.section.origin[1],
        vs[2] * value.location[2]
      ];
      return {
        ...state,
        section: { ...state.section, origin: newOrigin }
      };
    });
  };

  async componentDidUpdate(prevProps) {
    if (this.props.composition !== prevProps.composition) {
      const targetComp = this.props.composition;
      if (this.props.composition) {
        await this.props.composition.imageSource.ready();
        if (targetComp === this.props.composition) this.handleReady();
      }
    }
  }

  render() {
    const {
      value,
      index,
      onFeedbackChange,
      feedbackListener: FeedbackListener,
      feedback,
      composition
    } = this.props;

    return (
      <div className="lesion-candidate">
        <div className="attributes">
          <div>Rank: {value.rank}</div>
          <div>Loc: {JSON.stringify(value.location)}</div>
          <div>Confidence: {value.confidence}</div>
        </div>
        <ImageViewer
          className="lesion-candidate-viewer"
          composition={composition}
          tool="pager"
          initialTool="pager"
          stateChanger={this.stateChanger}
        />
        <div className="feedback-listener">
          <FeedbackListener
            value={feedback}
            options={['TP', 'FP', 'pending']}
            onChange={val => onFeedbackChange(index, val)}
          />
        </div>
      </div>
    );
  }
}

const StyledDiv = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  .lesion-candidate {
    border: 1px solid gray;
    padding: 1px;
    .attributes {
      font-size: 80%;
    }
    .image-viewer {
      width: 300px;
      height: 300px;
    }
  }
  .feedback-listener {
    margin: 5px;
  }
`;

class LesionCandidatesView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { compositoin: null };
  }

  async componentDidMount() {
    const { user, job, value } = this.props;
    const seriesUid = job.series[0].seriesUid;
    const server = user.data.dicomImageServer;
    const rsHttpClient = new rs.RsHttpClient(server);
    const volumeLoader = new rs.RsVolumeLoader({
      rsHttpClient,
      series: seriesUid
    });
    const src = new rs.HybridMprImageSource({
      rsHttpClient,
      volumeLoader,
      series: seriesUid
    });
    await src.ready();
    const composition = new rs.Composition(src);
    const metadata = src.metadata;

    const r = 20;
    value.forEach(cand => {
      const annotation = new rs.PlaneFigure();
      annotation.color = '#ff00ff';
      annotation.min = [
        (cand.location[0] - r) * metadata.voxelSize[0],
        (cand.location[1] - r) * metadata.voxelSize[1]
      ];
      annotation.max = [
        (cand.location[0] + r) * metadata.voxelSize[0],
        (cand.location[1] + r) * metadata.voxelSize[1]
      ];
      annotation.z = cand.location[2] * metadata.voxelSize[2];
      composition.addAnnotation(annotation);
    });
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
      <StyledDiv>
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
      </StyledDiv>
    );
  }
}

const LesionCandidates = connect(state => ({ user: state.loginUser }))(
  LesionCandidatesView
);

export default LesionCandidates;
