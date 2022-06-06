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
  sectionOverlapsVolume,
  sectionTo2dViewState
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';

export default function handleMoveBy(
  viewer: Viewer,
  dxOnScreen: number,
  dyOnScreen: number,
  baseState?: ViewState
) {
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  if (!baseState) baseState = viewer.getRequestingStateOrState();

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

  switch (baseState.type) {
    case 'mpr':
    case 'vr': {
      const baseSection = baseState.section;
      const section = translate(baseSection);

      // Abort if the processed section is not changed.
      if (sectionEquals(baseSection, section)) return;

      // Abort If the section does not overlap the volume.
      if (!overlap(section)) return;

      viewer.setState({ ...baseState, section });
      return;
    }
    case '2d': {
      const baseSection = sectionFrom2dViewState(baseState);
      const section = translate(baseSection);

      // Abort if the processed section is not changed.
      if (sectionEquals(baseSection, section)) return;

      // Abort If the section does not overlap the volume.
      if (!overlap(section)) return;

      viewer.setState({
        ...sectionTo2dViewState(baseState, section)
      });
      return;
    }
  }
}
