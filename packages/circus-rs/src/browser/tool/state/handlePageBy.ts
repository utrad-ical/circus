import { Vector2, Vector3 } from 'three';
import { getSectionDrawingViewState } from '../..';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimentionalImageSource from '../../image-source/TwoDimentionalImageSource';
import {
  convertToSection2D,
  orientationAwareTranslation,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';

export default function handlePageBy(viewer: Viewer, step: number): void {
  const prevState = viewer.getState();
  const resolution = viewer.getResolution();
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
      const prevSection = getSectionDrawingViewState(prevState);
      const section = orientationAwareTranslation(
        prevSection,
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
    case '2d': {
      step = Math.round(step);
      if (step === 0) return;
      const prevSection = getSectionDrawingViewState(prevState);
      const section = convertToSection2D(
        orientationAwareTranslation(prevSection, src.metadata!.voxelSize, step)
      );
      // Abort If the section does not overlap the volume.
      const overlap =
        0 <= section.imageNumber &&
        section.imageNumber < src.metadata!.voxelCount[2];
      if (!overlap) return;
      viewer.setState({ ...prevState, section });
      return;
    }
  }
}

export function handlePageByScrollbar(viewer: Viewer, step: number): void {
  const prevState = viewer.getState();
  const prevSection = getSectionDrawingViewState(prevState);
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen
  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimentionalImageSource)
  )
    return;

  const section = orientationAwareTranslation(
    prevSection,
    src.metadata!.voxelSize,
    step
  );

  switch (prevState.type) {
    case 'mpr': {
      const viewState = { ...prevState, section };
      viewer.setState(viewState);
      return;
    }
    case '2d': {
      const viewState = {
        ...prevState,
        section: convertToSection2D(section)
      };
      viewer.setState(viewState);
      return;
    }
  }
}
