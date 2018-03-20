import { Annotation } from './annotation';
import { Viewer } from '../viewer/viewer';
import { ViewState } from '../view-state';
import { Sprite } from '../viewer/sprite';
import { convertVolumeCoordinateToScreenCoordinate } from '../section-util';
import { Vector3D, intersectionOfTwoSections } from '../../common/geometry';
import { vec3 } from 'gl-matrix';

/**
 * ReferenceLine is a type of annotation which draws how the sections
 * of other viewers which share the same composition intersect with this viewer.
 */
export class ReferenceLine implements Annotation {
  /**
   * Color of the reference line.
   */
  public color: string = '#ff00ff';

  public draw(viewer: Viewer, viewState: ViewState): Sprite | null {
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen
    const siblingViewers = comp.viewers.filter(v => v !== viewer);

    if (viewState.type !== 'mpr') throw new Error('Unsupported view state.');
    const mySection = viewState.section;

    const canvas = viewer.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const res = viewer.getResolution();

    try {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;

      siblingViewers.forEach(sib => {
        const sibState = sib.getState();
        if (sibState.type !== 'mpr') return;
        const sibSection = sibState.section;
        if (sibSection === undefined) return;

        const refLine = intersectionOfTwoSections(mySection, sibSection);
        if (!refLine) return; // nothing to draw
        // console.log('drawing cross reference line', refLine);
        const from = convertVolumeCoordinateToScreenCoordinate(
          mySection,
          res,
          refLine.origin
        );
        const to = convertVolumeCoordinateToScreenCoordinate(
          mySection,
          res,
          vec3.add(vec3.create(), refLine.origin, refLine.vector) as Vector3D
        );
        // console.log('from, to = ', from, to);
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
        ctx.stroke();
      });
    } finally {
      ctx.restore();
    }
    return null;
  }
}
