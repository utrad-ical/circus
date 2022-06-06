import { Vector2, Vector3 } from 'three';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  orientationAwareTranslation,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';

export default function handlePageBy(
  viewer: Viewer,
  step: number,
  baseState?: ViewState
): void {
  if (!baseState) baseState = viewer.getRequestingStateOrState();

  const composition = viewer.getComposition();
  if (!composition) throw new Error('Composition not initialized'); // should not happen

  switch (baseState.type) {
    case 'mpr': {
      const src = composition.imageSource as MprImageSource;
      const resolution = viewer.getResolution();
      const section = orientationAwareTranslation(
        baseState.section,
        src.metadata!.voxelSize,
        step
      );

      // Abort If the section does not overlap the volume.
      const overlap = sectionOverlapsVolume(
        section,
        new Vector2().fromArray(resolution),
        new Vector3().fromArray(src.metadata!.voxelSize),
        new Vector3().fromArray(src.metadata!.voxelCount)
      );
      if (!overlap) return;

      viewer.setState({ ...baseState, section });
      return;
    }
    case '2d': {
      const src = composition.imageSource as TwoDimensionalImageSource;
      step = Math.round(step);
      if (step === 0) return;
      const imageNumber = baseState.imageNumber + step;

      // Abort If the section does not overlap the volume.
      const overlap =
        0 <= imageNumber && imageNumber < src.metadata!.voxelCount[2];
      if (!overlap) return;

      viewer.setState({ ...baseState, imageNumber });
      return;
    }
  }
}

export function handlePageByScrollbar(
  viewer: Viewer,
  step: number,
  baseState?: ViewState
): void {
  if (!baseState) baseState = viewer.getState();
  if (!baseState) throw new Error('View state not initialized');
  switch (baseState.type) {
    case 'mpr': {
      const composition = viewer.getComposition();
      if (!composition) return;
      const src = composition.imageSource as MprImageSource;
      const section = orientationAwareTranslation(
        baseState.section,
        src.metadata!.voxelSize,
        step
      );
      viewer.setState({ ...baseState, section });
      return;
    }
    case '2d': {
      const imageNumber = Math.round(baseState.imageNumber + step);
      viewer.setState({ ...baseState, imageNumber });
      return;
    }
    default:
      return;
  }
}
