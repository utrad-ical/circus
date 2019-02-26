import React, { Fragment } from 'react';
import ImageViewer from 'components/ImageViewer';
import { Button } from 'components/react-bootstrap';
import styled from 'styled-components';
import * as rs from 'circus-rs';
import { connect } from 'react-redux';
import EventEmitter from 'events';
import { toolFactory } from 'circus-rs/tool/tool-initializer';

class Candidate extends React.PureComponent {
  constructor(props) {
    super(props);
    this.stateChanger = new EventEmitter();
  }

  handleReady = () => {
    const { composition, value } = this.props;
    const voxelSize = composition.imageSource.metadata.voxelSize;
    this.stateChanger.emit('change', state => {
      const newOrigin = [
        state.section.origin[0],
        state.section.origin[1],
        voxelSize[2] * value.location[2]
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
      composition,
      tool,
      isConsensual
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
          tool={tool}
          stateChanger={this.stateChanger}
        />
        <div className="feedback-listener">
          <FeedbackListener
            value={feedback}
            isConsensual={isConsensual}
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
    this.tools = {
      pager: toolFactory('pager'),
      zoom: toolFactory('zoom'),
      hand: toolFactory('hand')
    };
    this.state = { compositoin: null, toolName: 'pager' };
  }

  async componentDidMount() {
    const { user, job, value } = this.props;
    const seriesUid = job.series[0].seriesUid;
    const server = user.data.dicomImageServer;
    const rsHttpClient = new rs.RsHttpClient(server);
    const volumeLoader = new rs.RsVolumeLoader({ rsHttpClient, seriesUid });
    const src = new rs.HybridMprImageSource({
      rsHttpClient,
      volumeLoader,
      seriesUid
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
    const newFeedback = feedback
      .filter(item => item.id !== index)
      .concat([{ id: index, value: selected }])
      .sort((a, b) => a.index - b.index);
    onFeedbackChange(newFeedback);
  };

  handleToolChange = () => {
    const toolName = { zoom: 'hand', hand: 'pager', pager: 'zoom' }[
      this.state.toolName
    ];
    this.setState({ toolName });
  };

  render() {
    const { value, feedbackListener, feedback, isConsensual } = this.props;
    const truncated = value.slice(0, 3);
    return (
      <Fragment>
        <div>
          <Button bsSize="xs" onClick={this.handleToolChange}>
            {this.state.toolName}
          </Button>
        </div>
        <StyledDiv>
          {truncated.map((cand, i) => {
            const feedbackItem = feedback.find(item => item.id === i);
            return (
              <Candidate
                key={i}
                value={cand}
                feedbackListener={feedbackListener}
                feedback={feedbackItem ? feedbackItem.value : undefined}
                isConsensual={isConsensual}
                index={i}
                onFeedbackChange={this.handleFeedbackChange}
                composition={this.state.composition}
                tool={this.tools[this.state.toolName]}
              />
            );
          })}
        </StyledDiv>
      </Fragment>
    );
  }
}

const LesionCandidates = connect(state => ({ user: state.loginUser }))(
  LesionCandidatesView
);

export default LesionCandidates;
