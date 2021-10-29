import { Vector2, Vector3 } from 'three';
import { scaleSection, Section } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  applySectionToTwoDimensionalState,
  asSectionInDrawingViewState,
  convertScreenCoordinateToVolumeCoordinate,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';

// HACK: Support-2d-image-source
export default function handleZoomBy(
  viewer: Viewer,
  step: number,
  zoomPoint?: [number, number]
) {
  const resolution = viewer.getResolution();

  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimensionalImageSource)
  )
    return;

  const overlap = (section: Section) => {
    const metadata = src.metadata!;
    return sectionOverlapsVolume(
      section,
      new Vector2().fromArray(resolution),
      new Vector3().fromArray(metadata.voxelSize),
      new Vector3().fromArray(metadata.voxelCount)
    );
  };

  const scale = (section: Section) => {
    const stepFactor = 1.05;
    return scaleSectionBy(
      section,
      1 / stepFactor ** step,
      resolution,
      zoomPoint ? zoomPoint : [resolution[0] * 0.5, resolution[1] * 0.5]
    );
  };

  const prevState = viewer.getState();
  switch (prevState.type) {
    case 'mpr':
    case 'vr': {
      const prevSection = prevState.section;
      const section = scale(prevSection);

      // Abort If the section does not overlap the volume.
      if (!overlap(section)) return;
      viewer.setState({ ...prevState, section });
      return;
    }
    case '2d': {
      const prevSection = asSectionInDrawingViewState(prevState);
      const section = scale(prevSection);

      // Abort If the section does not overlap the volume.
      if (!overlap(section)) return;
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
