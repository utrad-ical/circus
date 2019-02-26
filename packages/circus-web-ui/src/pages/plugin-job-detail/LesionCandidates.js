import React, { useState, useRef, useEffect } from 'react';
import ImageViewer from 'components/ImageViewer';
import IconButton from 'components/IconButton';
import styled from 'styled-components';
import * as rs from 'circus-rs';
import EventEmitter from 'events';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import useLoginUser from 'utils/useLoginUser';

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
      canEditFeedback,
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
            canEdit={canEditFeedback}
            onChange={val => onFeedbackChange(index, val)}
          />
        </div>
      </div>
    );
  }
}

const StyledDiv = styled.div`
  .tools {
    margin-bottom: 5px;
  }
  .entries {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    .lesion-candidate {
      border: 1px solid silver;
      padding: 1px;
      .attributes {
        font-size: 80%;
      }
      .image-viewer {
        width: 400px;
        height: 400px;
      }
    }
    .feedback-listener {
      margin: 5px;
    }
  }
`;

const LesionCandidates = React.memo(props => {
  const tools = useRef();
  if (!tools.current) {
    tools.current = [
      { name: 'pager', icon: 'rs-pager', tool: toolFactory('pager') },
      { name: 'zoom', icon: 'rs-zoom', tool: toolFactory('zoom') },
      { name: 'hand', icon: 'rs-hand', tool: toolFactory('hand') }
    ];
  }

  const [toolName, setToolName] = useState('pager');
  const [composition, setComposition] = useState(null);
  const user = useLoginUser();

  const didMount = async () => {
    const { job, value } = props;
    const seriesUid = job.series[0].seriesUid;
    const server = user.dicomImageServer;
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
    setComposition(composition);
  };

  useEffect(
    () => {
      didMount();
    },
    [props.job]
  );

  const handleFeedbackChange = (index, selected) => {
    const { feedbackDispatch, feedbackState } = this.props;
    const candidateFeedback = feedbackState.currentData.lesionCandidates || [];
    const newFeedback = candidateFeedback
      .filter(item => item.id !== index)
      .concat([{ id: index, value: selected }])
      .sort((a, b) => a.index - b.index);
    feedbackDispatch({
      type: 'changeFeedback',
      value: {
        ...feedbackState.currentData,
        lesionCandidates: newFeedback
      }
    });
  };

  const { value, feedbackListener, feedbackState } = props;
  const feedback = feedbackState.currentData.lesionCandidates || [];
  const truncated = value.slice(0, 3);
  return (
    <StyledDiv>
      <div className="tools">
        {tools.current.map(t => (
          <IconButton
            key={t.name}
            bsSize="sm"
            icon={t.icon}
            onClick={() => setToolName(t.name)}
            bsStyle={toolName === t.name ? 'primary' : 'default'}
          />
        ))}
      </div>
      <div className="entries">
        {truncated.map((cand, i) => {
          const feedbackItem = feedback.find(item => item.id === i);
          return (
            <Candidate
              key={i}
              value={cand}
              feedbackListener={feedbackListener}
              feedback={feedbackItem ? feedbackItem.value : undefined}
              canEditFeedback={feedbackState.canEditFeedback}
              isConsensual={feedbackState.isConsensual}
              index={i}
              onFeedbackChange={handleFeedbackChange}
              composition={composition}
              tool={tools.current.find(t => t.name === toolName).tool}
            />
          );
        })}
      </div>
    </StyledDiv>
  );
});

export default LesionCandidates;
