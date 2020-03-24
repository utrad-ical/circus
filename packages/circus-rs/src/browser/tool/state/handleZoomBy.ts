import { Vector2, Vector3 } from 'three';
import { Section, vectorizeSection } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import {
  convertScreenCoordinateToVolumeCoordinate,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';

export default function handleZoomBy(
  viewer: Viewer,
  step: number,
  zoomPoint?: [number, number]
) {
  const prevState = viewer.getState();
  const resolution = viewer.getResolution();

  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as MprImageSource;
  if (!(src instanceof MprImageSource)) return;

  const stepFactor = 1.05;

  switch (prevState.type) {
    case 'mpr':
    case 'vr':
      const section = scaleSectionBy(
        prevState.section,
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
      break;
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

  const vSection = vectorizeSection(section);
  return {
    origin: vSection.origin
      .sub(zoomingPointOnVolume)
      .multiplyScalar(scale)
      .add(zoomingPointOnVolume)
      .toArray(),
    xAxis: vSection.xAxis.multiplyScalar(scale).toArray(),
    yAxis: vSection.yAxis.multiplyScalar(scale).toArray()
  };
}
