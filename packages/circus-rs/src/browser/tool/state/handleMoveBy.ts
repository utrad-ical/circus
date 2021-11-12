import { Vector2, Vector3 } from 'three';
import {
  Section,
  sectionEquals,
  translateSection
} from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  sectionFrom2dViewState,
  sectionTo2dViewState,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';

// HACK: Support-2d-image-source
export default function handleMoveBy(
  viewer: Viewer,
  dxOnScreen: number,
  dyOnScreen: number
) {
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const src = comp.imageSource as any;
  if (
    !(src instanceof MprImageSource) &&
    !(src instanceof TwoDimensionalImageSource)
  )
    return;

  const translate = (section: Section) => {
    const move = new Vector2(dxOnScreen, dyOnScreen);
    const viewport = viewer.getViewport();
    const vp = new Vector2().fromArray(viewport);
    const moveScale = move.clone().divide(vp);
    const delta = new Vector3().addVectors(
      new Vector3().fromArray(section.xAxis).multiplyScalar(-moveScale.x),
      new Vector3().fromArray(section.yAxis).multiplyScalar(-moveScale.y)
    );
    return translateSection(section, delta);
  };

  const overlap = (section: Section) => {
    const resolution = viewer.getResolution();
    const metadata = src.metadata!;
    return sectionOverlapsVolume(
      section,
      new Vector2().fromArray(resolution),
      new Vector3().fromArray(metadata.voxelSize),
      new Vector3().fromArray(metadata.voxelCount)
    );
  };

  const prevState = viewer.getState();
  switch (prevState.type) {
    case 'mpr':
    case 'vr': {
      const prevSection = prevState.section;
      const section = translate(prevSection);

      // Abort if the processed section is not changed.
      if (sectionEquals(prevSection, section)) return;

      // Abort If the section does not overlap the volume.
      if (!overlap(section)) return;

      viewer.setState({ ...prevState, section });
      return;
    }
    case '2d': {
      const prevSection = sectionFrom2dViewState(prevState);
      const section = translate(prevSection);

      // Abort if the processed section is not changed.
      if (sectionEquals(prevSection, section)) return;

      // Abort If the section does not overlap the volume.
      if (!overlap(section)) return;

      viewer.setState({
        ...sectionTo2dViewState(prevState, section)
      });
      return;
    }
  }
}
