import { Vector2, Vector3 } from 'three';
import MprImageSource from '../image-source/MprImageSource';
import {
  convertPointToIndex,
  convertScreenCoordinateToVolumeCoordinate,
  convertVolumeCoordinateToScreenCoordinate,
  sectionFrom2dViewState
} from '../section-util';
import Viewer from '../viewer/Viewer';

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
 * from screen 2D coordinate to volume coordinate in millimeter
 */
export function convertViewerPointToVolumePoint(
  viewer: Viewer,
  px: number,
  py: number
): Vector3 {
  const viewState = viewer.getState();
  if (!viewState) throw new Error('View state not initialized');

  const type = viewState.type;
  if (type !== 'mpr' && type !== '2d')
    throw new Error('Unsupported view state.');

  const section =
    viewState.type !== '2d'
      ? viewState.section
      : sectionFrom2dViewState(viewState);

  const resolution = viewer.getResolution();
  return convertScreenCoordinateToVolumeCoordinate(
    section,
    new Vector2(resolution[0], resolution[1]),
    new Vector2(px, py)
  );
}

/**
 * from volume coordinate in millimeter to screen 2D coordinate
 */
export function convertVolumePointToViewerPoint(
  viewer: Viewer,
  px: number,
  py: number,
  pz: number
): Vector2 {
  const viewState = viewer.getState();
  if (!viewState) throw new Error('View state not initialized');

  const type = viewState.type;
  if (type !== 'mpr' && type !== '2d')
    throw new Error('Unsupported view state.');

  const section =
    viewState.type !== '2d'
      ? viewState.section
      : sectionFrom2dViewState(viewState);

  const resolution = viewer.getResolution();
  return convertVolumeCoordinateToScreenCoordinate(
    section,
    new Vector2(resolution[0], resolution[1]),
    new Vector3(px, py, pz)
  );
}

/**
 * from screen 2D coordinate to volume index
 */
export function convertViewerPointToVolumeIndex(
  viewer: Viewer,
  px: number,
  py: number
): Vector3 {
  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const point3inMillimeter = convertViewerPointToVolumePoint(viewer, px, py);

  // from volume coordinate in millimeter to index coordinate
  const src = comp.imageSource as MprImageSource;
  const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize);
  const indexOfVol = convertPointToIndex(point3inMillimeter, voxelSize);

  // floor
  return new Vector3(
    Math.floor(indexOfVol.x),
    Math.floor(indexOfVol.y),
    Math.floor(indexOfVol.z)
  );
}
