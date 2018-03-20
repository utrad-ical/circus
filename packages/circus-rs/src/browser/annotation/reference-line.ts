import { Annotation } from './annotation';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import Sprite from '../viewer/Sprite';
import { convertVolumeCoordinateToScreenCoordinate } from '../section-util';
import { intersectionOfTwoSections } from '../../common/geometry';
import { Vector2 } from 'three';

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
    const res = new Vector2().fromArray(viewer.getResolution());

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
          refLine.origin.clone().add(refLine.vector)
        );
        // console.log('from, to = ', from, to);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    } finally {
      ctx.restore();
    }
    return null;
  }
}
