import * as rs from 'circus-rs';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import ImageViewer, {
  createStateChanger,
  StateChangerFunc
} from 'components/ImageViewer';
import { Button } from 'components/react-bootstrap';
import React, {
  useEffect,
  useMemo,
  useImperativeHandle,
  useRef,
  useCallback,
  useState
} from 'react';
import styled from 'styled-components';
import { useHybridImageSource } from 'utils/useImageSource';
import IconButton from 'components/IconButton';
import applyDisplayOptions from './applyDisplayOptions';
import { FeedbackListenerProps, ImperativeFeedbackRef } from '../types';

type Location = { volumeId: number; location: number[] };

const Locator = React.forwardRef<
  any,
  FeedbackListenerProps<Location[], { volumeId: number }>
>((props, ref) => {
  const { job, onChange, isConsensual, value = [], disabled, options } = props;
  const { volumeId = 0 } = options;

  const [composition, setComposition] = useState<rs.Composition | undefined>(
    undefined
  );
  const [showViewer, setShowViewer] = useState(value.length > 0);

  const noLocationClickedRef = useRef(false);

  const toolRef = useRef<{ pager: any; point: any }>();
  if (!toolRef.current) {
    toolRef.current = {
      pager: toolFactory('pager'),
      point: toolFactory('point')
    };
  }

  /**
   * Remembers voxel size of the current series.
   */
  const voxelSizeRef = useRef<number[]>();

  const stateChanger = useMemo(() => createStateChanger<rs.MprViewState>(), []);

  // Exports "methods" for this FB listener
  useImperativeHandle<any, ImperativeFeedbackRef<Location[]>>(ref, () => ({
    mergePersonalFeedback: personalFeedback => {
      const result: Location[] = [];
      personalFeedback.forEach(f => {
        f.forEach(loc => {
          result.push(loc);
        });
      });
      return result;
    },
    validate: value => {
      return (
        noLocationClickedRef.current ||
        (Array.isArray(value) && value.length > 0)
      );
    }
  }));

  const series = job.series[volumeId];
  const imageSource = useHybridImageSource(
    series.seriesUid,
    series.partialVolumeDescriptor
  );

  useEffect(() => {
    if (!imageSource) return;
    voxelSizeRef.current = imageSource.metadata!.voxelSize;
    const comp = new rs.Composition(imageSource);
    setComposition(comp);
  }, [imageSource]);

  useEffect(() => {
    if (!composition) return;
    composition.removeAllAnnotations();
    const voxelSize = voxelSizeRef.current!;
    value.forEach(item => {
      const point = new rs.Point();
      point.x = item.location[0] * voxelSize[0];
      point.y = item.location[1] * voxelSize[1];
      point.z = item.location[2] * voxelSize[2];
      point.color = '#ff00ff';
      composition.addAnnotation(point);
    });
    composition.annotationUpdated();
  }, [composition, value]);

  const initialStateSetter = useCallback(
    (viewer, state) => applyDisplayOptions(state, job, volumeId),
    [volumeId, job]
  );

  const handleMouseUp = () => {
    if (disabled || !composition) return;
    const newValue: Location[] = [];
    const voxelSize = voxelSizeRef.current!;
    composition.annotations.forEach((point: any) => {
      newValue.push({
        volumeId: 0,
        location: [
          Math.round(point.x / voxelSize[0]),
          Math.round(point.y / voxelSize[1]),
          Math.round(point.z / voxelSize[2])
        ]
      });
    });
    onChange(newValue);
  };

  const handleRemovePoint = (index: number) => {
    if (disabled) return;
    const newValue = value.slice();
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleReveal = (index: number) => {
    const item = value[index];
    const changer: StateChangerFunc<rs.MprViewState> = state => {
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
    };
    stateChanger(changer);
  };

  const handleYesClick = () => {
    noLocationClickedRef.current = false;
    setShowViewer(true);
    onChange([]);
  };

  const handleNoClick = () => {
    noLocationClickedRef.current = true;
    setShowViewer(false);
    onChange([]);
  };

  if (disabled && value.length === 0) {
    return <div>No input.</div>;
  }

  if (!showViewer) {
    return (
      <div>
        Input Locations <Button onClick={handleYesClick}>Yes</Button>
        <Button
          onClick={handleNoClick}
          bsStyle={noLocationClickedRef.current ? 'primary' : 'default'}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <StyledDiv>
      <div className="side">
        <ImageViewer
          className="locator"
          initialStateSetter={initialStateSetter}
          tool={toolRef.current[disabled ? 'pager' : 'point']}
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
                {isConsensual && <th>Entered By</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {value.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{JSON.stringify(item.location)}</td>
                  {isConsensual && <td />}
                  <td>
                    <IconButton
                      icon="circus-focus"
                      title="Reveal"
                      bsSize="xs"
                      onClick={() => handleReveal(i)}
                    />
                    {!disabled && (
                      <IconButton
                        icon="remove"
                        title="Remove"
                        bsSize="xs"
                        onClick={() => handleRemovePoint(i)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {value.length === 0 && (
            <div>
              <Button onClick={handleNoClick}>Confirm no input</Button>
            </div>
          )}
        </div>
      </div>
    </StyledDiv>
  );
});

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

export default Locator;
