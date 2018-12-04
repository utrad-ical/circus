import ToolBaseClass from '../../browser/tool/Tool';
import ViewerEvent from '../../browser/viewer/ViewerEvent';

/**
 * DragInfo holds convenient data while dragging.
 */
export interface DragInfo {
  /**
   * The mouse travel distance since the previous drag event.
   */
  dx: number;

  /**
   * The mouse travel distance since the previous drag event.
   */
  dy: number;

  /**
   * The total mouse travel distance since the mouse was pressed.
   */
  totalDx: number;

  /**
   * The total mouse travel distance since the mouse was pressed.
   */
  totalDy: number;
}

/**
 * DraggableTool is a base class for tools that handles mouse dragging
 * over the Viewer.
 * This class manages a protected member "dragInfo", which holds handy values
 * such as the total mouse move distance from the drag start point.
 */
export default abstract class DraggableTool extends ToolBaseClass {
  protected usePointerLockAPI: boolean = true;

  /**
   * Holds some useful drag-related variables.
   */
  protected dragInfo!: DragInfo;

  private prevX!: number;
  private prevY!: number;
  private startX!: number;
  private startY!: number;
  private prevTotalX!: number;
  private prevTotalY!: number;

  public dragStartHandler(ev: ViewerEvent): void {
    if (
      typeof ev.viewerX === 'undefined' ||
      typeof ev.viewerY === 'undefined'
    ) {
      return;
    }
    this.prevTotalX = 0;
    this.prevTotalY = 0;
    this.prevX = ev.viewerX;
    this.prevY = ev.viewerY;
    this.startX = ev.viewerX;
    this.startY = ev.viewerY;
    this.updateInfo(ev);

    if (this.usePointerLockAPI) ev.viewer.canvas.requestPointerLock();
  }

  public dragHandler(ev: ViewerEvent): void {
    this.updateInfo(ev);
  }

  public dragEndHandler(ev: ViewerEvent): void {
    this.updateInfo(ev);
    if (this.usePointerLockAPI) document.exitPointerLock();
  }

  private updateInfo(ev: ViewerEvent): void {
    // Hack: For some reason, drag events can be called with zero screenX/Y values
    // when the mouse is released. We ignore such events by setting dx and dy to zero.
    if (ev.original.screenX === 0 && ev.original.screenY === 0) {
      this.dragInfo.dx = 0;
      this.dragInfo.dy = 0;
      return;
    }
    if (typeof ev.viewerX === 'undefined' || typeof ev.viewerY === 'undefined')
      return;

    if (
      typeof ev.movementX === 'undefined' ||
      typeof ev.movementY === 'undefined'
    ) {
      this.dragInfo = {
        dx: ev.viewerX - this.prevX,
        dy: ev.viewerY - this.prevY,
        totalDx: ev.viewerX - this.startX,
        totalDy: ev.viewerY - this.startY
      };
      this.prevX = ev.viewerX;
      this.prevY = ev.viewerY;
    } else {
      this.dragInfo = {
        dx: ev.movementX!,
        dy: ev.movementY!,
        totalDx: this.prevTotalX + ev.movementX!,
        totalDy: this.prevTotalY + ev.movementY!
      };
      this.prevX = ev.viewerX;
      this.prevY = ev.viewerY;
      this.prevTotalX = this.dragInfo.totalDx;
      this.prevTotalY = this.dragInfo.totalDy;
    }
  }
}
