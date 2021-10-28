import { Vector2, Vector3 } from 'three';
import { sectionEquals, translateSection } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  asSectionInDrawingViewState,
  applySectionToTwoDimensionalState,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import { TwoDimensionalViewState } from '../../ViewState';

export default function handleMoveBy(
  viewer: Viewer,
  dxOnScreen: number,
  dyOnScreen: number
) {
  const move = new Vector2(dxOnScreen, dyOnScreen);

  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimensionalImageSource)
  )
    return;

  const prevState = viewer.getState();

  const viewport = viewer.getViewport();
  const resolution = viewer.getResolution();

  const vp = new Vector2().fromArray(viewport);

  const moveScale = move.clone().divide(vp);

  // HACK: Support-2d-image-source
  switch (prevState.type) {
    case 'mpr': {
      const prevSection = prevState.section;
      const section = translateSection(
        prevSection,
        new Vector3().addVectors(
          new Vector3()
            .fromArray(prevSection.xAxis)
            .multiplyScalar(-moveScale.x),
          new Vector3()
            .fromArray(prevSection.yAxis)
            .multiplyScalar(-moveScale.y)
        )
      );

      // Abort if the processed section is not changed.
      if (sectionEquals(prevSection, section)) return;

      // Abort If the section does not overlap the volume.
      const overlap = sectionOverlapsVolume(
        section,
        new Vector2().fromArray(resolution),
        new Vector3().fromArray(src.metadata!.voxelSize),
        new Vector3().fromArray(src.metadata!.voxelCount)
      );
      if (!overlap) return;

      viewer.setState({ ...prevState, section });
      return;
    }
    case '2d': {
      const prevSection = asSectionInDrawingViewState(prevState);
      const section = translateSection(
        prevSection,
        new Vector3().addVectors(
          new Vector3()
            .fromArray(prevSection.xAxis)
            .multiplyScalar(-moveScale.x),
          new Vector3()
            .fromArray(prevSection.yAxis)
            .multiplyScalar(-moveScale.y)
        )
      );

      // Abort if the processed section is not changed.
      if (sectionEquals(prevSection, section)) return;

      // Abort If the section does not overlap the volume.
      const overlap = sectionOverlapsVolume(
        section,
        new Vector2().fromArray(resolution),
        new Vector3().fromArray(src.metadata!.voxelSize),
        new Vector3().fromArray(src.metadata!.voxelCount)
      );
      if (!overlap) return;

      viewer.setState({
        ...applySectionToTwoDimensionalState(prevState, section)
      });
      return;
    }
  }
}
