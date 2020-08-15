import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  useMemo
} from 'react';
import ImageViewer, { createStateChanger } from 'components/ImageViewer';
import IconButton from 'components/IconButton';
import styled from 'styled-components';
import * as rs from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import createDynamicComponent from '../createDynamicComponent';
import { useHybridImageSource } from 'utils/useImageSource';
import applyDisplayOptions from './applyDisplayOptions';
import {
  FeedbackListenerProps,
  ImperativeFeedbackRef,
  Job,
  FeedbackEntry
} from '../types';

const Candidate = React.forwardRef<
  any,
  {
    job: Job;
    item: any;
    value: any;
    personalOpinions?: any[];
    onChange: (value: any) => void;
    disabled?: boolean;
    isConsensual: boolean;
    feedbackListener: any;
    tool: rs.Tool;
  }
>((props, ref) => {
  const {
    job,
    item, // candidate data
    value, // feedback value
    personalOpinions,
    onChange,
    disabled,
    isConsensual,
    feedbackListener: FeedbackListener,
    tool
  } = props;

  const [composition, setComposition] = useState<rs.Composition | null>(null);

  // Create image source
  const series = job.series[item.volumeId];
  const imageSource = useHybridImageSource(
    series.seriesUid,
    series.partialVolumeDescriptor
  );
  const stateChanger = useMemo(() => createStateChanger(), []);

  useEffect(() => {
    if (!imageSource) return;
    // imageSource is guaruanteed to be "ready"
    const comp = new rs.Composition(imageSource);
    const metadata = imageSource.metadata!;

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
  }, [imageSource, item.location]);

  const centerState = useCallback(
    state => {
      const voxelSize = (composition!.imageSource as any).metadata.voxelSize;
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
    (viewer, state) =>
      applyDisplayOptions(centerState(state), job, item.volumeId),
    [centerState, item.volumeId, job]
  );

  const handleCenterizeClick = () => {
    stateChanger(centerState);
  };

  if (!imageSource || !composition) return null;
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
            icon="circus-focus"
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
          personalOpinions={personalOpinions}
          onChange={onChange}
          isConsensual={isConsensual}
          disabled={disabled}
        />
      </div>
    </div>
  );
});

type LesionCandidateFeedback = { id: number; value: any }[];

const LesionCandidates = React.forwardRef<
  any,
  FeedbackListenerProps<
    LesionCandidateFeedback,
    {
      feedbackListener: { type: string; options: any };
      maxDisplay?: number;
      sortBy?: [string, string];
    }
  >
>((props, ref) => {
  const {
    job,
    value = [],
    personalOpinions,
    onChange,
    isConsensual,
    disabled,
    options: {
      feedbackListener,
      maxDisplay = 3,
      sortBy: [sortKey, sortOrder] = ['rank', 'asc']
    }
  } = props;

  const FeedbackListener = useMemo(() => {
    if (!feedbackListener) return undefined;
    return createDynamicComponent(
      feedbackListener.type,
      feedbackListener.options
    );
  }, [feedbackListener]);

  // Keeps track of multiple refs using Map
  const listenerRefs = useRef<Map<any, any>>(new Map());
  // if (!listenerRefs.current) listenerRefs.current = new Map();

  const candidates = job.results.results.lesionCandidates as any[];

  const visibleCandidates = candidates
    .slice()
    .sort((a, b) => {
      const sign = sortOrder === 'desc' ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * sign;
    })
    .slice(0, maxDisplay);

  const tools = useRef<any[]>();
  if (!tools.current) {
    tools.current = [
      { name: 'pager', icon: 'rs-pager', tool: toolFactory('pager') },
      { name: 'zoom', icon: 'rs-zoom', tool: toolFactory('zoom') },
      { name: 'hand', icon: 'rs-hand', tool: toolFactory('hand') }
    ];
  }

  const [toolName, setToolName] = useState('pager');

  // Exports "instance methods"
  useImperativeHandle<any, ImperativeFeedbackRef<LesionCandidateFeedback>>(
    ref,
    () => ({
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
        if (!Array.isArray(value)) return false;
        return visibleCandidates.every(cand => {
          const item = value.find(item => item.id === cand.rank);
          if (!item) return false;
          return listenerRefs.current.get(cand.rank).validate(item.value);
        });
      }
    })
  );

  const handleFeedbackChange = (id: number, newValue: any) => {
    const newFeedback = value
      .filter(item => item.id !== id)
      .concat([{ id, value: newValue }])
      .sort((a, b) => a.id - b.id);
    onChange(newFeedback);
  };

  const personalOpinionsForItem = (
    id: number
  ): FeedbackEntry<any>[] | undefined => {
    if (!isConsensual) return undefined;
    return personalOpinions!.map(f => {
      const feedbackItem = f.data.find(item => item.id === id);
      return {
        ...f,
        data: feedbackItem ? feedbackItem.value : undefined
      };
    });
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
              job={job}
              key={cand.rank}
              ref={ref => listenerRefs.current.set(cand.rank, ref)}
              item={cand}
              feedbackListener={FeedbackListener}
              value={feedbackItem ? feedbackItem.value : undefined}
              personalOpinions={personalOpinionsForItem(cand.rank)}
              disabled={disabled}
              isConsensual={isConsensual}
              onChange={val => handleFeedbackChange(cand.rank, val)}
              tool={tools.current!.find(t => t.name === toolName).tool}
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    grid-gap: 5px;
    justify-content: space-between;
    .lesion-candidate {
      border: 1px solid silver;
      .header {
        padding: 3px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
      .attributes {
        font-size: 80%;
      }
      .image-viewer {
        width: 100%;
        height: 400px;
      }
    }
    .feedback-listener {
      padding: 3px;
    }
  }
`;
