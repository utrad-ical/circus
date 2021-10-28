import { Vector2, Vector3 } from 'three';
import { scaleSection, Section } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  asSectionInDrawingViewState,
  convertScreenCoordinateToVolumeCoordinate,
  applySectionToTwoDimensionalState,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import { TwoDimensionalViewState } from '../../ViewState';

export default function handleZoomBy(
  viewer: Viewer,
  step: number,
  zoomPoint?: [number, number]
) {
  const prevState = viewer.getState();
  const resolution = viewer.getResolution();

  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimensionalImageSource)
  )
    return;

  // HACK: Support-2d-image-source
  switch (prevState.type) {
    case 'mpr': {
      const stepFactor = 1.05;
      const prevSection = prevState.section;

      const section = scaleSectionBy(
        prevSection,
        1 / stepFactor ** step,
        resolution,
        zoomPoint ? zoomPoint : [resolution[0] * 0.5, resolution[1] * 0.5]
      );

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
      const stepFactor = 1.05;
      const prevSection = asSectionInDrawingViewState(prevState);

      const section = scaleSectionBy(
        prevSection,
        1 / stepFactor ** step,
        resolution,
        zoomPoint ? zoomPoint : [resolution[0] * 0.5, resolution[1] * 0.5]
      );

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
      break;
    }
  }
}

function scaleSectionBy(
  section: Section,
  scale: number,
  resolution: [number, number],
  zoomingPointOnScreen: [number, number]
): Section {
  const zoomingPointOnVolume = convertScreenCoordinateToVolumeCoordinate(
    section,
    new Vector2(resolution[0], resolution[1]),
    new Vector2().fromArray(zoomingPointOnScreen)
  );
  return scaleSection(section, scale, zoomingPointOnVolume.toArray());
}
