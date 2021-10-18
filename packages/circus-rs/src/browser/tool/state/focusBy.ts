import { Vector2 } from 'three';
import { getSectionDrawingViewState } from '../..';
import { Vector3D } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimentionalImageSource from '../../image-source/TwoDimentionalImageSource';
import {
  convertToSection2D,
  translateOriginToCenter
} from '../../section-util';
import Viewer from '../../viewer/Viewer';

export default function focusBy(
  viewer: Viewer,
  focusPoint: Vector3D | undefined
) {
  if (!focusPoint) return;
  const prevState = viewer.getState();
  const resolution = new Vector2().fromArray(viewer.getResolution());
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimentionalImageSource)
  )
    return;

  const prevSection = getSectionDrawingViewState(prevState);
  const section = translateOriginToCenter(
    {
      origin: focusPoint,
      xAxis: prevSection.xAxis,
      yAxis: prevSection.yAxis
    },
    resolution
  );

  switch (prevState.type) {
    case 'mpr': {
      viewer.setState({ ...prevState, section });
      return;
    }
    case '2d': {
      viewer.setState({
        ...prevState,
        section: convertToSection2D(section)
      });
      return;
    }
  }
}
