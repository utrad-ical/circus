import { Vector2, Vector3 } from 'three';
import { convertScreenCoordinateToVolumeCoordinate } from '../section-util';
import ViewerEvent from '../viewer/ViewerEvent';

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

/**
 * Converts 2D point in viewer event (screen coordinate) to 3D point in volume coordinate space.
 * @param ev target
 */
export const getVolumeCoordinateFromViewerEvent = (
  ev: ViewerEvent
): Vector3 => {
  const screenPoint = [ev.viewerX!, ev.viewerY!];
  const resolution = ev.viewer.getResolution();
  const viewState = ev.viewer.getState();
  const section = viewState.section;
  return convertScreenCoordinateToVolumeCoordinate(
    section,
    new Vector2().fromArray(resolution),
    new Vector2().fromArray(screenPoint)
  );
};
