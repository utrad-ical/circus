import Composition from '../../Composition';
import VoxelCloud from '../../annotation/VoxelCloud';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import MprImageSource from '../../image-source/MprImageSource';
import * as su from '../../section-util';
import { draw3DLine } from '../../volume-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { Vector2, Vector3 } from 'three';

/**
 * VoxelCloudToolBase is a base tool that affects VoxelCloud annotations.
 */
export default class VoxelCloudToolBase extends DraggableTool {
  // Disable pointer lock API
  protected usePointerLockAPI: boolean = false;

  protected activeCloud: VoxelCloud | null = null;

  protected pX: number | undefined;
  protected pY: number | undefined;

  constructor() {
    super();
    this.options = { width: 1 };
  }

  public activate(viewer: Viewer): void {
    viewer.primaryEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.primaryEventTarget = null;
  }

  protected convertViewerPoint(point: Vector2, viewer: Viewer): Vector3 {
    const state = viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state.');
    const section = state.section;

    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const resolution = viewer.getResolution();
    const src = comp.imageSource as MprImageSource;
    const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize);
    const activeCloud = this.activeCloud!; // guaranteed to be set

    // from screen 2D coordinate to volume coordinate in millimeter
    const mmOfVol = su.convertScreenCoordinateToVolumeCoordinate(
      section,
      new Vector2(resolution[0], resolution[1]),
      point
    );
    // from volume coordinate in millimeter to index coordinate
    const indexOfVol = su.convertPointToIndex(mmOfVol, voxelSize);
    // to local coordinate of the cloud (simple translation)
    const indexOfCloud = indexOfVol.sub(
      new Vector3().fromArray(activeCloud.origin!)
    );
    // round
    return new Vector3(
      Math.round(indexOfCloud.x),
      Math.round(indexOfCloud.y),
      Math.round(indexOfCloud.z)
    );
  }

  protected draw3DLineWithValue(
    viewer: Viewer,
    start: Vector2,
    end: Vector2,
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
    draw3DLine(activeCloud.volume!, start3D, end3D, value);
  }

  protected draw3DLineWithValueAndWidth(
    viewer: Viewer,
    start: Vector2,
    end: Vector2,
    value: number,
    width: number = 1
  ): void {
    const ds = -Math.floor((width - 1) / 2);
    for (let x = ds; x < ds + width; x++) {
      for (let y = ds; y < ds + width; y++) {
        const deltaStart = new Vector2(start.x + x, start.y + y);
        const deltaEnd = new Vector2(end.x + x, end.y + y);
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

  public mouseMoveHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
  }

  public dragStartHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
    super.dragStartHandler(ev);
    const comp = ev.viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen
    this.activeCloud = this.getActiveCloud(comp);
    this.pX = ev.viewerX;
    this.pY = ev.viewerY;
  }

  public dragDraw(ev: ViewerEvent, value: number, width: number): void {
    ev.stopPropagation();
    const comp = ev.viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const dragInfo = this.dragInfo;
    if (dragInfo.dx === 0 && dragInfo.dy === 0) return; // no mouse move

    this.draw3DLineWithValueAndWidth(
      ev.viewer,
      new Vector2(this.pX, this.pY),
      new Vector2(ev.viewerX, ev.viewerY),
      value,
      (this.options as any).width || 1
    );

    this.pX = ev.viewerX;
    this.pY = ev.viewerY;

    comp.dispatchAnnotationChanging(this.activeCloud!);
    comp.annotationUpdated(ev.viewer);
  }

  public dragEndHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    comp.dispatchAnnotationChange(this.activeCloud!);
    comp.annotationUpdated();
  }
}
