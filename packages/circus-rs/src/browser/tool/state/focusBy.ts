import { Vector2 } from 'three';
import {
  convertToDummyMprSection,
  convertToTwoDimensionalViewSection,
  TwoDimensionalViewSection,
  Vector3D
} from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimentionalImageSource from '../../image-source/TwoDimentionalImageSource';
import { translateOriginToCenter } from '../../section-util';
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
      const prevSection = prevState.section as TwoDimensionalViewSection;
      const prevSectionDummy = convertToDummyMprSection(prevSection);
      const sectionDummy = translateOriginToCenter(
        {
          origin: focusPoint,
          xAxis: prevSectionDummy.xAxis,
          yAxis: prevSectionDummy.yAxis
        },
        resolution
      );
      const section = convertToTwoDimensionalViewSection(sectionDummy);
      viewer.setState({ ...prevState, section });
      return;
    }
  }
}
