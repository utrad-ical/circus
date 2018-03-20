import { Composition } from '../../composition';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { DraggableTool } from '../draggable';
import { Viewer } from '../../viewer/viewer';
import MprImageSource from '../../image-source/MprImageSource';
import * as su from '../../section-util';
import { Vector2D, Vector3D } from '../../../common/geometry';
import { vec3 } from 'gl-matrix';
import { draw3DLine } from '../../volume-util';
import { ViewerEvent } from '../../viewer/viewer-event';

/**
 * VoxelCloudToolBase is a base tool that affects VoxelCloud annotations.
 */
export class VoxelCloudToolBase extends DraggableTool {
  protected activeCloud: VoxelCloud | null = null;

  protected pX: number;
  protected pY: number;

  constructor() {
    super();
    this.options = { width: 1 };
  }

  protected convertViewerPoint(point: Vector2D, viewer: Viewer): Vector3D {
    const state = viewer.getState();
    const section = state.section;
    if (!section) throw new Error('Unsupported view state.');

    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const resolution = viewer.getResolution();
    const src = comp.imageSource as MprImageSource;
    const voxelSize = src.metadata.voxelSize;
    const activeCloud = <VoxelCloud>this.activeCloud; // guaranteed to be set

    // from screen 2D coordinate to volume coordinate in millimeter
    const mmOfVol = su.convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      point
    );
    // from volume coordinate in millimeter to index coordinate
    const indexOfVol = su.convertPointToIndex(mmOfVol, voxelSize);
    // to local coordinate of the cloud (simple translation)
    const indexOfCloud = vec3.subtract(
      indexOfVol,
      indexOfVol,
      activeCloud.origin
    ) as Vector3D;
    // round
    return [
      Math.round(indexOfCloud[0]),
      Math.round(indexOfCloud[1]),
      Math.round(indexOfCloud[2])
    ] as Vector3D;
  }

  protected draw3DLineWithValue(
    viewer: Viewer,
    start: Vector2D,
    end: Vector2D,
    value: number
  ): void {
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const src = comp.imageSource as MprImageSource;

    if (!this.activeCloud) return; // no cloud to paint on
    const activeCloud = this.activeCloud;

    // Expand the target volume so that it covers the source image
    activeCloud.expandToMaximum(src);

    // convert mouse cursor location to cloud's local coordinate
    const start3D = this.convertViewerPoint(start, viewer);
    const end3D = this.convertViewerPoint(end, viewer);

    // draw a 3D line segment over a volume
    draw3DLine(activeCloud.volume, start3D, end3D, value);
  }

  protected draw3DLineWithValueAndWidth(
    viewer: Viewer,
    start: Vector2D,
    end: Vector2D,
    value: number,
    width: number = 1
  ): void {
    const ds = -Math.floor((width - 1) / 2);
    for (let x = ds; x < ds + width; x++) {
      for (let y = ds; y < ds + width; y++) {
        const deltaStart: Vector2D = [start[0] + x, start[1] + y];
        const deltaEnd: Vector2D = [end[0] + x, end[1] + y];
        this.draw3DLineWithValue(viewer, deltaStart, deltaEnd, value);
      }
    }
  }

  /**
   * Find the active VoxelCloud annotation in a composition
   * @return If there is only one active VoxelCloud instance, returns it.
   */
  protected getActiveCloud(composition: Composition): VoxelCloud | null {
    let activeCloud: VoxelCloud | null = null;
    composition.annotations.forEach(antn => {
      if (antn instanceof VoxelCloud && antn.active) {
        if (activeCloud !== null)
          throw new Error('There are more than one active VoxelCloud.');
        activeCloud = antn;
      }
    });
    return activeCloud;
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    const comp = ev.viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen
    this.activeCloud = this.getActiveCloud(comp);
    this.pX = ev.viewerX;
    this.pY = ev.viewerY;
  }

  public dragDraw(ev: ViewerEvent, value: number, width: number): void {
    const comp = ev.viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const dragInfo = this.dragInfo;
    if (dragInfo.dx === 0 && dragInfo.dy === 0) return; // no mouse move

    this.draw3DLineWithValueAndWidth(
      ev.viewer,
      [this.pX, this.pY],
      [ev.viewerX, ev.viewerY],
      value,
      (this.options as any).width || 1
    );

    this.pX = ev.viewerX;
    this.pY = ev.viewerY;

    comp.annotationUpdated(ev.viewer);
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    comp.annotationUpdated();
  }
}
