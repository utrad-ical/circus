import * as rs from '@utrad-ical/circus-rs/src/browser';
import get from 'lodash.get';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import styled from 'styled-components';
import { FeedbackEntry, Job, useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { createStateChanger, ImageViewer } from '../../ui/ImageViewer';
import { Button } from '../../ui/Button';
import { defaultDataPath, normalizeCandidates } from './LesionCandidates';

type IntegrationOptions = 'off' | 'snapped';

export interface LocatorOptions {
  /**
   * Target volume ID. Default = 0.
   */
  volumeId?: number;
  excludeFromActionLog?: boolean;
  /**
   * When turned on, the clicked location snaps to the nearest lesion candidate.
   */
  snapThresholdMm?: number | false;
  /**
   * Specify the data path of lesion candidates.
   */
  snapDataPath?: string;

  consensualIntegration?: IntegrationOptions;
}

const enteredBy = Symbol();

export interface Location {
  volumeId: number;
  location: number[];
  snappedLesionCandidate?: number;
  data?: any;
  /**
   * Used in consensual feedback to track who initially input this feedback.
   * Will be ignored on JSON-stringification.
   */
  [enteredBy]?: string[];
}

export type LocatorFeedback = Array<Location>;

const applyDisplayOptions = (
  state: rs.MprViewState,
  job: Job,
  volumeId: number
) => {
  const displayOptions =
    job.results.metadata &&
    Array.isArray(job.results.metadata.displayOptions) &&
    job.results.metadata.displayOptions.find(
      (o: any) => o.volumeId === volumeId
    );
  if (!displayOptions) return state;
  if (displayOptions.window) {
    state = { ...state, window: { ...displayOptions.window } };
  }
  /*if (displayOptions.crop) {
      const crop = displayOptions.crop;
      const voxelSize = composition.imageSource.metadata.voxelSize;
      const os = state.section;
      const section = {
        origin: [
          crop.origin[0] * voxelSize[0],
          crop.origin[1] * voxelSize[1],
          os.origin[2]
        ],
        xAxis: [crop.size[0] * voxelSize[0], os.xAxis[1], os.xAxis[2]],
        yAxis: [os.yAxis[0], crop.size[1] * voxelSize[1], os.yAxis[2]]
      };
      state = { ...state, section };
    }*/
  return state;
};

/**
 * Integrates personal opinions into initial consensual feedback.
 */
const integrateEntries = (
  opinions: readonly FeedbackEntry<LocatorFeedback>[],
  options?: IntegrationOptions
): Location[] => {
  const allLocs = opinions
    .map(entry =>
      entry.data.map(loc => ({ ...loc, [enteredBy]: [entry.userEmail] }))
    )
    .flat();
  if (options === 'snapped') {
    const integratedLocs: Location[] = [];
    allLocs.forEach(loc => {
      const idx = integratedLocs.findIndex(
        loc => loc.snappedLesionCandidate === loc.snappedLesionCandidate
      );
      if (idx >= 0) {
        integratedLocs[idx][enteredBy]!.push(loc[enteredBy]![0]);
      } else {
        integratedLocs.push(loc);
      }
    });
    return integratedLocs;
  }
  return allLocs;
};

const distance = (x: number[], y: number[], vs: number[]) => {
  const mx = [x[0] * vs[0], x[1] * vs[1], x[2] * vs[2]];
  const my = [y[0] * vs[0], y[1] * vs[1], y[2] * vs[2]];
  return Math.sqrt(
    (mx[0] - my[0]) * (mx[0] - my[0]) +
      (mx[1] - my[1]) * (mx[1] - my[1]) +
      (mx[2] - my[2]) * (mx[2] - my[2])
  );
};

export const Locator: Display<LocatorOptions, LocatorFeedback> = props => {
  const {
    options,
    personalOpinions,
    initialFeedbackValue,
    onFeedbackChange
  } = props;
  const {
    job,
    consensual,
    editable,
    rsHttpClient,
    getVolumeLoader,
    eventLogger
  } = useCsResults();

  const {
    volumeId = 0,
    excludeFromActionLog,
    consensualIntegration,
    snapThresholdMm = false,
    snapDataPath = defaultDataPath
  } = options;
  const { results } = job;
  const [noConfirmed, setNoConfirmed] = useState(false);

  /**
   * Remembers voxel size of the current series.
   */
  const voxelSizeRef = useRef<number[]>();

  const [currentFeedback, setCurrentFeedback] = useState<LocatorFeedback>(
    initialFeedbackValue ??
      (consensual
        ? integrateEntries(personalOpinions, consensualIntegration)
        : [])
  );

  const [showViewer, setShowViewer] = useState(currentFeedback.length > 0);

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const [composition, setComposition] = useState<rs.Composition | undefined>(
    undefined
  );

  const toolRef = useRef<{ pager: any; point: any }>();
  if (!toolRef.current) {
    toolRef.current = {
      pager: rs.toolFactory('pager'),
      point: rs.toolFactory('point')
    };
  }

  const stateChanger = useMemo(() => createStateChanger<rs.MprViewState>(), []);

  useEffect(() => {
    if (!editable && currentFeedback.length === 0) return;
    const targetSeries = job.series[volumeId];
    const volumeLoader = getVolumeLoader(targetSeries);
    const imageSource = new rs.HybridMprImageSource({
      volumeLoader,
      seriesUid: targetSeries.seriesUid,
      rsHttpClient
    });
    const comp = new rs.Composition(imageSource);
    imageSource.ready().then(() => {
      voxelSizeRef.current = imageSource.metadata!.voxelSize;
    });
    setComposition(comp);
  }, [job.series, volumeId]);

  const log = (action: string, data?: any) => {
    if (!excludeFromActionLog) eventLogger(action, data);
  };

  const handleRemovePoint = (index: number) => {
    if (!editable) return;
    const newFeedback = currentFeedback.slice();
    newFeedback.splice(index, 1);
    setCurrentFeedback(newFeedback);
    setActiveIndex(undefined);
    log('Locator: remove location');
  };

  const handleReveal = (index: number) => {
    const item = currentFeedback[index];
    setActiveIndex(index);
    stateChanger(state => {
      const voxelSize = voxelSizeRef.current!;
      const newOrigin = [
        state.section.origin[0],
        state.section.origin[1],
        item.location[2] * voxelSize[2]
      ];
      return {
        ...state,
        section: { ...state.section, origin: newOrigin }
      };
    });
  };

  const handleYesClick = () => {
    setNoConfirmed(false);
    setShowViewer(true);
    onFeedbackChange({ valid: false, error: 'No locations have been input' });
    log('Locator: open viewer');
  };

  const handleNoClick = () => {
    setNoConfirmed(true);
    setCurrentFeedback([]);
    setShowViewer(false);
    log('Locator: close viewer');
  };

  useEffect(() => {
    const valid = (showViewer && currentFeedback.length > 0) || noConfirmed;
    if (valid) {
      onFeedbackChange({ valid: true, value: currentFeedback });
    } else {
      onFeedbackChange({ valid: false });
    }
  }, [currentFeedback, noConfirmed, showViewer]);

  useEffect(() => {
    if (!composition) return;
    const voxelSize = voxelSizeRef.current;
    if (!voxelSize) return;
    composition.removeAllAnnotations();
    currentFeedback.forEach((item, i) => {
      const point = new rs.Point();
      point.location = [
        item.location[0] * voxelSize[0],
        item.location[1] * voxelSize[1],
        item.location[2] * voxelSize[2]
      ];
      point.color = i === activeIndex ? '#ff0000' : '#ff00ff';
      composition.addAnnotation(point);
    });
    composition.annotationUpdated();
  }, [composition, currentFeedback, activeIndex]);

  const handleMouseUp = () => {
    if (!editable || !composition) return;
    const voxelSize = voxelSizeRef.current!;
    const newPoint = composition.annotations[
      composition.annotations.length - 1
    ] as rs.Point;
    let location = [
      Math.round(newPoint.location![0] / voxelSize[0]),
      Math.round(newPoint.location![1] / voxelSize[1]),
      Math.round(newPoint.location![2] / voxelSize[2])
    ];
    let snappedLesionCandidate: number | undefined = undefined;
    if (snapThresholdMm > 0) {
      let minDistance = Infinity;
      const candidates = normalizeCandidates(get(results, snapDataPath));
      candidates.forEach(cand => {
        const d = distance(cand.location, location, voxelSize);
        if (d <= snapThresholdMm && d < minDistance) {
          snappedLesionCandidate = cand.id;
          location = cand.location;
          minDistance = d;
        }
      });
    }
    const newLocation: Location = {
      volumeId,
      location,
      ...(typeof snappedLesionCandidate === 'number'
        ? { snappedLesionCandidate }
        : {})
    };
    const newValue = [...currentFeedback, newLocation];
    setCurrentFeedback(newValue);
    setActiveIndex(newValue.length - 1);
    log('Locator: add location');
  };

  const initialStateSetter = useCallback(
    (state: rs.MprViewState) => applyDisplayOptions(state, job, volumeId),
    [volumeId, job]
  );

  if (!editable && currentFeedback.length === 0) return <div>No Input</div>;

  if (!showViewer) {
    return (
      <div>
        Input Locations <Button onClick={handleYesClick}>Yes</Button>
        <Button onClick={handleNoClick} selected={noConfirmed}>
          No
        </Button>
      </div>
    );
  }

  if (!composition) return null;

  return (
    <StyledDiv>
      <div className="side">
        <ImageViewer
          className="locator"
          initialStateSetter={initialStateSetter}
          tool={toolRef.current[editable ? 'point' : 'pager']}
          stateChanger={stateChanger}
          composition={composition}
          onMouseUp={handleMouseUp}
        />
        <div>
          <table className="locations table">
            <thead>
              <tr>
                <th>#</th>
                <th>Position</th>
                {typeof snapThresholdMm === 'number' && <th>Snapped to</th>}
                {consensual && <th>Entered By</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {currentFeedback.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{JSON.stringify(item.location)}</td>
                  {typeof snapThresholdMm === 'number' && (
                    <td>{item.snappedLesionCandidate ?? '-'}</td>
                  )}
                  {consensual && <td>{item[enteredBy]!.join(', ')}</td>}
                  <td>
                    <Button
                      size="xs"
                      icon="circus-focus"
                      onClick={() => handleReveal(i)}
                    >
                      Reveal
                    </Button>
                    {editable && (
                      <Button
                        size="xs"
                        icon="glyphicon-remove"
                        onClick={() => handleRemovePoint(i)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {currentFeedback.length === 0 && (
            <div>
              <button onClick={handleNoClick}>Confirm no input</button>
            </div>
          )}
        </div>
      </div>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  margin-top: 10px;
  .side {
    display: flex;
    flex-direction: row;
    > *:first-child {
      margin-right: 10px;
    }
  }
  .locator {
    width: 512px;
    height: 512px;
  }
`;
