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

export default function focusBy(
  viewer: Viewer,
  focusPoint: Vector3D | undefined
) {
  if (!focusPoint) return;

  const prevState = viewer.getState();
  if (!prevState) return;

  const resolution = new Vector2().fromArray(viewer.getResolution());
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimensionalImageSource)
  )
    return;

  switch (prevState.type) {
    case 'mpr': {
      const prevSection = prevState.section;
      const section = translateOriginToCenter(
        {
          origin: focusPoint,
          xAxis: prevSection.xAxis,
          yAxis: prevSection.yAxis
        },
        resolution
      );
      viewer.setState({ ...prevState, section });
      return;
    }
    case '2d': {
      const prevSection = sectionFrom2dViewState(prevState);
      const section = translateOriginToCenter(
        {
          origin: focusPoint,
          xAxis: prevSection.xAxis,
          yAxis: prevSection.yAxis
        },
        resolution
      );
      viewer.setState({
        ...sectionTo2dViewState(prevState, section)
      });
      return;
    }
  }
}
