import { Vector2, Vector3 } from 'three';
import MprImageSource from '../image-source/MprImageSource';
import Viewer from '../viewer/Viewer';
import * as su from '../section-util';

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

export function convertViewerPointToVolumeIndex(
  viewer: Viewer,
  px: number,
  py: number
): Vector3 {
  const state = viewer.getState();
  if (state.type !== 'mpr') throw new Error('Unsupported view state.');
  const section = state.section;

  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const resolution = viewer.getResolution();
  const src = comp.imageSource as MprImageSource;
  const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize);

  // from screen 2D coordinate to volume coordinate in millimeter
  const mmOfVol = su.convertScreenCoordinateToVolumeCoordinate(
    section,
    new Vector2(resolution[0], resolution[1]),
    new Vector2(px, py)
  );
  // from volume coordinate in millimeter to index coordinate
  const indexOfVol = su.convertPointToIndex(mmOfVol, voxelSize);
  // floor
  return new Vector3(
    Math.floor(indexOfVol.x),
    Math.floor(indexOfVol.y),
    Math.floor(indexOfVol.z)
  );
}
