import ViewerEvent from '../viewer/ViewerEvent';
import { MprImageSource, orientationAwareTranslation, Viewer } from '..';
import ViewerEventTarget from '../interface/ViewerEventTarget';

/**
 * Utility method which works in the same way as Math.sign().
 * Private polyfill.
 * @param val Input number.
 * @returns {number} 1 if val is positive, -1 if negative, 0 if zero.
 */
export function sign(val: number): number {
  val = +val; // convert to a number
  if (val === 0 || isNaN(val)) return val;
  return val > 0 ? 1 : -1;
}
