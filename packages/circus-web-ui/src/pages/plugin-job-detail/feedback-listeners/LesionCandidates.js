import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  useMemo
} from 'react';
import ImageViewer from 'components/ImageViewer';
import IconButton from 'components/IconButton';
import styled from 'styled-components';
import * as rs from 'circus-rs';
import EventEmitter from 'events';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import useLoginUser from 'utils/useLoginUser';
import createDynamicComponent from '../createDynamicComponent';

const Candidate = React.forwardRef((props, ref) => {
  const {
    item, // candidate data
    value, // feedback value
    onChange,
    disabled,
    isConsensual,
    feedbackListener: FeedbackListener,
    imageSource,
    tool
  } = props;

  const [composition, setComposition] = useState(null);

  const stateChangerRef = useRef(undefined);
  if (!stateChangerRef.current) stateChangerRef.current = new EventEmitter();
  const stateChanger = stateChangerRef.current;

  useEffect(
    () => {
      if (!imageSource) return;
      // imageSource is guaruanteed to be "ready"
      const comp = new rs.Composition(imageSource);
      const metadata = imageSource.metadata;

      // Add an circle annotation to this composition
      const r = 20;
      const annotation = new rs.PlaneFigure();
      annotation.color = '#ff00ff';
      annotation.min = [
        (item.location[0] - r) * metadata.voxelSize[0],
        (item.location[1] - r) * metadata.voxelSize[1]
      ];
      annotation.max = [
        (item.location[0] + r) * metadata.voxelSize[0],
        (item.location[1] + r) * metadata.voxelSize[1]
      ];
      annotation.z = item.location[2] * metadata.voxelSize[2];
      comp.addAnnotation(annotation);

      setComposition(comp);
    },
    [imageSource, item.location]
  );

  const centerState = useCallback(
    state => {
      const voxelSize = composition.imageSource.metadata.voxelSize;
      const newOrigin = [
        state.section.origin[0],
        state.section.origin[1],
        voxelSize[2] * item.location[2]
      ];
      return {
        ...state,
        section: { ...state.section, origin: newOrigin }
      };
    },
    [composition, item.location]
  );

  const initialStateSetter = useCallback(
    (viewer, state) => centerState(state),
    [centerState]
  );

  const handleCenterizeClick = () => {
    stateChanger.emit('change', centerState);
  };

  if (!composition) return null;
  return (
    <div className="lesion-candidate">
      <div className="header">
        <div className="attributes">
          <div>Rank: {item.rank}</div>
          <div>Loc: {JSON.stringify(item.location)}</div>
          <div>Confidence: {item.confidence}</div>
        </div>
        <div>
          <IconButton
            title="Reveal"
            bsSize="xs"
            icon="glyphicon-record"
            onClick={handleCenterizeClick}
          />
        </div>
      </div>
      <ImageViewer
        initialStateSetter={initialStateSetter}
        className="lesion-candidate-viewer"
        composition={composition}
        tool={tool}
        stateChanger={stateChanger}
      />
      <div className="feedback-listener">
        <FeedbackListener
          ref={ref}
          value={value}
          onChange={onChange}
          isConsensual={isConsensual}
          disabled={disabled}
        />
      </div>
    </div>
  );
});

const LesionCandidates = React.forwardRef((props, ref) => {
  const {
    job,
    value = [],
    onChange,
    isConsensual,
    disabled,
    options: { feedbackListener }
  } = props;

  const FeedbackListener = useMemo(
    () =>
      createDynamicComponent(feedbackListener.type, feedbackListener.options),
    [feedbackListener.type, feedbackListener.options]
  );

  // Keeps track of multiple refs using Map
  /**
   * @type React.MutableRefObject<Map<number, any>>;
   */
  const listenerRefs = useRef(undefined);
  if (!listenerRefs.current) listenerRefs.current = new Map();
  useImperativeHandle(ref, () => ({
    mergePersonalFeedback: () => listenerRefs.current.mergePersonalFeedback()
  }));

  const candidates = job.results.results.lesionCandidates;
  const visibleCandidates = candidates.slice(0, 3);
  const seriesUid = job.series[0].seriesUid;

  const tools = useRef();
  if (!tools.current) {
    tools.current = [
      { name: 'pager', icon: 'rs-pager', tool: toolFactory('pager') },
      { name: 'zoom', icon: 'rs-zoom', tool: toolFactory('zoom') },
      { name: 'hand', icon: 'rs-hand', tool: toolFactory('hand') }
    ];
  }

  const [toolName, setToolName] = useState('pager');
  const [imageSource, setImageSource] = useState(null);
  const user = useLoginUser();
  const server = user.dicomImageServer;

  // Exports "instance methods"
  useImperativeHandle(ref, () => ({
    mergePersonalFeedback: personalFeedback => {
      return visibleCandidates.map(cand => {
        const fbsOfCand = personalFeedback.map(pfb => {
          const a = pfb.find(i => i.id === cand.rank);
          return a ? a.value : undefined;
        });
        return {
          id: cand.rank,
          value: listenerRefs.current
            .get(cand.rank)
            .mergePersonalFeedback(fbsOfCand)
        };
      });
    },
    validate: value => {
      return visibleCandidates.every(cand => {
        const item = value.find(item => item.id === cand.rank);
        if (!item) return false;
        return listenerRefs.current.get(cand.rank).validate(item.value);
      });
    }
  }));

  // Create image source
  useEffect(
    () => {
      const load = async () => {
        setImageSource(null);
        const rsHttpClient = new rs.RsHttpClient(server);
        const volumeLoader = new rs.RsVolumeLoader({ rsHttpClient, seriesUid });
        const src = new rs.HybridMprImageSource({
          rsHttpClient,
          volumeLoader,
          seriesUid
        });
        await src.ready();
        setImageSource(src);
      };
      load();
    },
    [seriesUid, server]
  );

  const handleFeedbackChange = (id, newValue) => {
    const newFeedback = value
      .filter(item => item.id !== id)
      .concat([{ id, value: newValue }])
      .sort((a, b) => a.index - b.index);
    onChange(newFeedback);
  };

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
        {visibleCandidates.map(cand => {
          const feedbackItem = value.find(item => item.id === cand.rank);
          return (
            <Candidate
              key={cand.rank}
              ref={ref => listenerRefs.current.set(cand.rank, ref)}
              item={cand}
              feedbackListener={FeedbackListener}
              value={feedbackItem ? feedbackItem.value : undefined}
              disabled={disabled}
              isConsensual={isConsensual}
              index={cand.rank}
              onChange={val => handleFeedbackChange(cand.rank, val)}
              imageSource={imageSource}
              tool={tools.current.find(t => t.name === toolName).tool}
            />
          );
        })}
      </div>
    </StyledDiv>
  );
});

export default LesionCandidates;

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
      .header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
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
