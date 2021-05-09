import * as rs from '@utrad-ical/circus-rs/src/browser';
import {
  Composition,
  HybridMprImageSource,
  MprImageSource,
  PlaneFigure,
  Tool
} from '@utrad-ical/circus-rs/src/browser';
import classnames from 'classnames';
import get from 'lodash.get';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import styled from 'styled-components';
import { useCsResults } from '../CsResultsContext';
import { Display, DisplayDefinition, FeedbackReport } from '../Display';
import { createStateChanger, ImageViewer } from '../viewer/CsImageViewer';
import { Button } from './Button';

interface LesionCandidate {
  id: number;
  rank: number;
  confidence: number;
  size: number;
  volumeId?: number;
  location: [number, number, number];
}

interface LesionCandidatesOptions {
  dataPath?: string;
  feedbackListener?: DisplayDefinition | null;
  maxCandidates?: number;
  confidenceThreshold?: number;
  sortBy: [keyof LesionCandidate, 'asc' | 'desc'];
  excludeFromActionLog?: boolean;
}

const normalizeCandidates = (input: any): LesionCandidate[] => {
  if (!Array.isArray(input)) throw new Error();
  return input.map((item, index) => {
    if ('id' in item) return item;
    return { id: index, ...item };
  });
};

const Candidate: React.FC<{
  imageSource: MprImageSource;
  item: LesionCandidate;
  tool: Tool;
}> = props => {
  const { imageSource, item, tool, children } = props;

  const stateChanger = useMemo(() => createStateChanger(), []);

  const composition = useMemo(() => new Composition(imageSource), [
    imageSource
  ]);

  useEffect(() => {
    const addAnnotation = async () => {
      await imageSource.ready();
      const metadata = imageSource.metadata!;
      // Add an circle annotation to this composition
      const r = 20;
      const annotation = new PlaneFigure();
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
      composition.addAnnotation(annotation);
    };
    addAnnotation();
  }, [composition, imageSource]);

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

  const handleCenterizeClick = () => {
    stateChanger(centerState);
  };

  return (
    <div className="lesion-candidate">
      <div className="header">
        <div className="attributes">
          <div>Rank: {item.rank}</div>
          <div>Loc: {JSON.stringify(item.location)}</div>
          <div>Confidence: {item.confidence}</div>
        </div>
        <div>
          <Button onClick={handleCenterizeClick} size="xs">
            Center
          </Button>
        </div>
      </div>
      <ImageViewer
        className="lesion-candidate-viewer"
        composition={composition}
        tool={tool}
        stateChanger={stateChanger}
      />
      {children}
    </div>
  );
};

type LesionCandidateFeedback = { id: number; value: any }[];

export const LesionCandidates: Display<
  LesionCandidatesOptions,
  LesionCandidateFeedback
> = props => {
  const {
    initialFeedbackValue,
    options: {
      dataPath = 'lesionCandidates',
      sortBy: [sortKey, sortOrder] = ['rank', 'asc'],
      maxCandidates,
      feedbackListener,
      excludeFromActionLog
    },
    personalOpinions,
    onFeedbackChange
  } = props;
  const {
    consensual,
    job,
    getVolumeLoader,
    rsHttpClient,
    loadDisplay,
    eventLogger
  } = useCsResults();
  const { results } = job;
  const [composition, setComposition] = useState<Composition | null>(null);

  const [currentFeedback, setCurrentFeedback] = useState<
    LesionCandidateFeedback
  >(initialFeedbackValue ?? []);

  const allCandidates = useMemo(
    () => normalizeCandidates(get(results.results, dataPath)),
    [results.results, dataPath]
  );
  const visibleCandidates = useMemo(
    () =>
      allCandidates
        .slice() // copy
        .sort((a, b) => {
          const sign = sortOrder === 'desc' ? -1 : 1;
          const aa = sortKey === 'location' ? a.location[2] : a[sortKey];
          const bb = sortKey === 'location' ? b.location[2] : b[sortKey];
          return (aa! - bb!) * sign;
        })
        .slice(0, maxCandidates),
    [allCandidates, sortOrder, sortKey, maxCandidates]
  );

  useEffect(() => {
    const volumeId = 0;
    const series = job.series[volumeId];
    const volumeLoader = getVolumeLoader(series);
    const src = new HybridMprImageSource({
      volumeLoader,
      rsHttpClient,
      seriesUid: series.seriesUid
    });
    const composition = new Composition(src);
    setComposition(composition);
  }, []);

  const tools = useRef<{ name: string; icon: string; tool: rs.Tool }[]>();
  if (!tools.current) {
    tools.current = [
      { name: 'pager', icon: 'rs-pager', tool: rs.toolFactory('pager') },
      { name: 'zoom', icon: 'rs-zoom', tool: rs.toolFactory('zoom') },
      { name: 'hand', icon: 'rs-hand', tool: rs.toolFactory('hand') }
    ];
  }
  const [toolName, setToolName] = useState('pager');

  // Prepare compositions
  const [imgSrcMap, setImgSrcMap] = useState<{
    [volumeId: number]: MprImageSource;
  }>({});

  const imageSourceForVolumeId = (volumeId: number) => {
    if (imgSrcMap[volumeId]) return imgSrcMap[volumeId];
    const series = job.series[volumeId];
    const volumeLoader = getVolumeLoader(series);
    const imageSource = new HybridMprImageSource({
      rsHttpClient,
      seriesUid: series.seriesUid,
      volumeLoader
    });
    setImgSrcMap(map => ({ ...map, [volumeId]: imageSource }));
    return imageSource;
  };

  const handleFeedbackChange = (id: number, status: FeedbackReport<any>) => {
    if (status.valid) {
      setCurrentFeedback(fb =>
        fb.filter(item => item.id !== id).concat({ id, value: status.value })
      );
      if (!excludeFromActionLog) {
        eventLogger('LesionCandidates feedback', { id, value: status.value });
      }
    } else if (currentFeedback.some(item => item.id === id)) {
      // remove invalid feedback
      setCurrentFeedback(fb => fb.filter(item => item.id !== id));
    }
  };

  useEffect(() => {
    const allValid = visibleCandidates.every(
      cand => currentFeedback.findIndex(item => item.id === cand.id) >= 0
    );
    if (allValid) {
      onFeedbackChange({ valid: true, value: currentFeedback });
    } else {
      onFeedbackChange({ valid: false, error: 'Feedback incomplete' });
    }
  }, [currentFeedback]);

  const [FeedbackListener, setFeedbackListener] = useState<
    Display<any, any> | undefined
  >(undefined);
  useEffect(() => {
    if (!feedbackListener) return;
    const load = async () => {
      const FeedbackListener = await loadDisplay(feedbackListener.type);
      setFeedbackListener(() => FeedbackListener); // assign function as state
    };
    load();
  }, [feedbackListener]);

  if (!composition || (feedbackListener && !FeedbackListener)) return null;

  return (
    <StyledDiv>
      <div className="tools">
        {tools.current!.map(t => (
          <Button
            key={t.name}
            size="sm"
            className={classnames('tool', { active: t.name === toolName })}
            icon={t.icon}
            onClick={() => setToolName(t.name)}
          />
        ))}
      </div>
      <div className="entries">
        {visibleCandidates.map(cand => {
          const feedbackItem = currentFeedback.find(
            item => item.id === cand.id
          );
          const candPersonalOpinions = consensual
            ? personalOpinions.map(fb => {
                const target = fb.data.find(c => c.id === cand.id);
                return { ...fb, data: target?.value };
              })
            : [];
          const tool = tools.current!.find(t => t.name === toolName)?.tool!;
          return (
            <Candidate
              key={cand.id}
              item={cand}
              tool={tool}
              imageSource={imageSourceForVolumeId(cand.volumeId ?? 0)}
            >
              {feedbackListener && FeedbackListener && (
                <div className="feedback-listener">
                  <FeedbackListener
                    initialFeedbackValue={feedbackItem?.value}
                    personalOpinions={candPersonalOpinions}
                    options={feedbackListener.options}
                    onFeedbackChange={status =>
                      handleFeedbackChange(cand.id, status)
                    }
                  />
                </div>
              )}
            </Candidate>
          );
        })}
      </div>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  .tools {
    margin-bottom: 5px;
    .tool {
      &.active {
        background-color: ${(props: any) => props.theme.brandPrimary};
      }
    }
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
