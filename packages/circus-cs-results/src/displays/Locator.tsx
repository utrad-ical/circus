import * as rs from '@utrad-ical/circus-rs/src/browser';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import styled from 'styled-components';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { ImageViewer } from '../viewer/CsImageViewer';
import { createStateChanger } from '../viewer/CsImageViewer';
import { Button } from './Button';
import { Job } from '../CsResultsContext';

export interface LocatorOptions {
  volumeId?: number;
}

export interface Location {
  volumeId: number;
  location: number[];
  data?: any;
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

export const Locator: Display<LocatorOptions, LocatorFeedback> = props => {
  const { options, initialFeedbackValue, onFeedbackChange } = props;
  const {
    job,
    consensual,
    editable,
    rsHttpClient,
    getVolumeLoader
  } = useCsResults();

  const { volumeId = 0 } = options;
  const [noConfirmed, setNoConfirmed] = useState(false);
  const [showViewer, setShowViewer] = useState(
    initialFeedbackValue?.length ?? 0 > 0
  );

  /**
   * Remembers voxel size of the current series.
   */
  const voxelSizeRef = useRef<number[]>();

  const [currentFeedback, setCurrentFeedback] = useState<LocatorFeedback>(
    initialFeedbackValue ?? []
  );

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
    setCurrentFeedback([]);
  }, [job.series, volumeId]);

  const handleRemovePoint = (index: number) => {
    if (!editable) return;
    const newFeedback = currentFeedback.slice();
    newFeedback.splice(index, 1);
    setCurrentFeedback(newFeedback);
  };

  const handleReveal = (index: number) => {
    const item = currentFeedback[index];
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
  };

  const handleNoClick = () => {
    setNoConfirmed(true);
    setCurrentFeedback([]);
    setShowViewer(false);
  };

  useEffect(() => {
    const valid = (showViewer && currentFeedback.length > 0) || noConfirmed;
    if (valid) {
      onFeedbackChange({ valid: true, value: currentFeedback });
    } else {
      onFeedbackChange({ valid: false });
    }
  }, [currentFeedback, noConfirmed, showViewer]);

  const handleMouseUp = () => {
    if (!editable || !composition) return;
    const newValue: Location[] = [];
    const voxelSize = voxelSizeRef.current!;
    composition.annotations.forEach((point: any) => {
      newValue.push({
        volumeId,
        location: [
          Math.round(point.location[0] / voxelSize[0]),
          Math.round(point.location[1] / voxelSize[1]),
          Math.round(point.location[2] / voxelSize[2])
        ]
      });
    });
    setCurrentFeedback(newValue);
  };

  const initialStateSetter = useCallback(
    (state, viewer) => applyDisplayOptions(state, job, volumeId),
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
                {consensual && <th>Entered By</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {currentFeedback.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{JSON.stringify(item.location)}</td>
                  {consensual && <td />}
                  <td>
                    <Button size="xs" onClick={() => handleReveal(i)}>
                      Reveal
                    </Button>
                    {editable && (
                      <Button size="xs" onClick={() => handleRemovePoint(i)}>
                        Remove
                      </Button>
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
