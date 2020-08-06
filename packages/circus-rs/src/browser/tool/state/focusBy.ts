import { Vector2 } from 'three';
import { Vector3D } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import { translateOriginToCenter } from '../../section-util';
import Viewer from '../../viewer/Viewer';

export default function focusby(
  viewer: Viewer,
  focusPoint: Vector3D | undefined
) {
  if (!focusPoint) return;
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen
  const src = comp.imageSource as MprImageSource;
  if (!(src instanceof MprImageSource)) return;

  const prevState = viewer.getState();
  const prevSection = prevState.section;
  const resolution = new Vector2().fromArray(viewer.getResolution());
  const section = translateOriginToCenter(
    {
      origin: focusPoint,
      xAxis: prevSection.xAxis,
      yAxis: prevSection.yAxis
    },
    resolution
  );
  viewer.setState({ ...prevState, section });
}
