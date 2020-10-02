import { Vector2, Vector3 } from 'three';
import MprImageSource from '../../image-source/MprImageSource';
import {
  orientationAwareTranslation,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';

export default function handlePageBy(viewer: Viewer, step: number): void {
  const prevState = viewer.getState();
  const resolution = viewer.getResolution();
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen
  const src = comp.imageSource as MprImageSource;
  if (!(src instanceof MprImageSource)) return;
  switch (prevState.type) {
    case 'mpr': {
      const section = orientationAwareTranslation(
        prevState.section,
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
      viewer.setState({ ...prevState, section });
      return;
    }
  }
}

export function handlePageByScrollbar(viewer: Viewer, step: number): void {
  const prevState = viewer.getState();
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen
  const src = comp.imageSource as MprImageSource;
  if (!(src instanceof MprImageSource)) return;

  switch (prevState.type) {
    case 'mpr': {
      const section = orientationAwareTranslation(
        prevState.section,
        src.metadata!.voxelSize,
        step
      );
      const viewState = { ...prevState, section };
      viewer.setState(viewState);
      return;
    }
  }
}
