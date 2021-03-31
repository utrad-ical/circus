import Composition from '../../Composition';
import VoxelCloud from '../../annotation/VoxelCloud';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import MprImageSource from '../../image-source/MprImageSource';
import { processVoxelsOnLine } from '../../volume-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { Box3, Vector3 } from 'three';
import { ToolOptions } from '../Tool';
import { convertViewerPointToVolumeIndex } from '../tool-util';
import { Vector2D } from 'circus-rs/src/common/geometry';

/**
 * VoxelCloudToolBase is a base tool that affects VoxelCloud annotations.
 */
export default class VoxelCloudToolBase<
  T extends ToolOptions = ToolOptions
> extends DraggableTool<T> {
  // Disable pointer lock API
  protected usePointerLockAPI: boolean = false;

  protected activeCloud: VoxelCloud | null = null;

  protected pX: number | undefined;
  protected pY: number | undefined;

  public activate(viewer: Viewer): void {
    viewer.primaryEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.primaryEventTarget = null;
  }

  protected draw3DLineWithValueAndWidth(
    viewer: Viewer,
    start: Vector2D,
    end: Vector2D,
    value: number,
    width: number = 1
  ): void {
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const state = viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state.');

    const activeCloud = this.activeCloud;
    if (!activeCloud) return; // no cloud to paint on
    const volume = activeCloud.volume!;

    const src = comp.imageSource as MprImageSource;
    const voxelCount = new Vector3().fromArray(src.metadata!.voxelCount);
    const volumeBox = new Box3(new Vector3(0, 0, 0), voxelCount);

    // Expand the target volume so that it covers the source image
    activeCloud.expandToMaximum(src);

    const [sx, sy] = start;
    const [ex, ey] = end;

    const edge0 = convertViewerPointToVolumeIndex(viewer, sx, sy);
    const edge1 = convertViewerPointToVolumeIndex(viewer, ex, ey);
    const v = new Vector3(
      edge1.x - edge0.x,
      edge1.y - edge0.y,
      edge1.z - edge0.z
    );
    const pen = Math.floor(0.5 * (width - 1));
    //  < width >
    // p0 ------ p1
    // |           ^
    // |    C      width
    // |           v
    // p2
    const p0 = convertViewerPointToVolumeIndex(viewer, sx - pen, sy - pen);
    const p1 = convertViewerPointToVolumeIndex(viewer, sx + pen, sy - pen);
    const p2 = convertViewerPointToVolumeIndex(viewer, sx - pen, sy + pen);
    const u = new Vector3(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);

    // p0 to p1
    processVoxelsOnLine(p0, p1, a => {
      // p0 to p2
      processVoxelsOnLine(a, a.clone().add(u), b => {
        // Stroke
        processVoxelsOnLine(b, b.clone().add(v), voxel => {
          if (volumeBox.containsPoint(voxel)) {
            volume.writePixelAt(value, voxel.x, voxel.y, voxel.z);
          }
        });
      });
    });
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
      [this.pX!, this.pY!],
      [ev.viewerX!, ev.viewerY!],
      value,
      width || 1
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
