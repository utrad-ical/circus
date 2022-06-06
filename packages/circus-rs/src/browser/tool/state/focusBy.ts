import { Vector2 } from 'three';
import { Vector3D } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  sectionFrom2dViewState,
  sectionTo2dViewState,
  translateOriginToCenter
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';

export default function focusBy(
  viewer: Viewer,
  focusPoint: Vector3D | undefined,
  baseState?: ViewState
) {
  if (!focusPoint) return;

  if (!baseState) baseState = viewer.getRequestingStateOrState();

  const resolution = new Vector2().fromArray(viewer.getResolution());
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimensionalImageSource)
  )
    return;

  switch (baseState.type) {
    case 'mpr': {
      const baseSection = baseState.section;
      const section = translateOriginToCenter(
        {
          origin: focusPoint,
          xAxis: baseSection.xAxis,
          yAxis: baseSection.yAxis
        },
        resolution
      );
      viewer.setState({ ...baseState, section });
      return;
    }
    case '2d': {
      const baseSection = sectionFrom2dViewState(baseState);
      const section = translateOriginToCenter(
        {
          origin: focusPoint,
          xAxis: baseSection.xAxis,
          yAxis: baseSection.yAxis
        },
        resolution
      );
      viewer.setState({
        ...sectionTo2dViewState(baseState, section)
      });
      return;
    }
  }
}
