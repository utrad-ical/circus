import { EventEmitter } from 'events';
import { ViewerEvent } from '../../browser/viewer/viewer-event';
import { VolumeImageSource } from '../image-source/volume-image-source';
import { ViewerEventTarget } from '../interface/viewer-event-target';
import { orientationAwareTranslation } from '../section-util';

/**
 * A tool determines how a viewer intersects with various UI events.
 * An active tool will change the active view state of each viewer.
 */
export class Tool extends EventEmitter implements ViewerEventTarget {
  public options: object = {};

  public mouseDownHandler(ev: ViewerEvent): void {
    // do nothing
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    // do nothing
  }

  public mouseUpHandler(ev: ViewerEvent): void {
    // do nothing
  }

  public dragStartHandler(ev: ViewerEvent): void {
    // do nothing
  }

  public dragHandler(ev: ViewerEvent): void {
    // do nothing
  }

  public dragEndHandler(ev: ViewerEvent): void {
    // do nothing
  }

  /**
   * Utility method which works in the same way as Math.sign().
   * Private polyfill.
   * @param val Input number.
   * @returns {number} 1 if val is positive, -1 if negative, 0 if zero.
   */
  protected sign(val: number): number {
    val = +val; // convert to a number
    if (val === 0 || isNaN(val)) return val;
    return val > 0 ? 1 : -1;
  }

  public setOptions(options: any): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * The default mouse wheel handler, which performs paging.
   */
  public wheelHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const state = viewer.getState();
    const step = -this.sign(ev.original.deltaY) * (ev.original.ctrlKey ? 5 : 1);
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen
    const src = comp.imageSource as VolumeImageSource;
    if (!(src instanceof VolumeImageSource)) return;
    const voxelSize = src.voxelSize();
    state.section = orientationAwareTranslation(state.section, voxelSize, step);
    viewer.setState(state);
  }
}
