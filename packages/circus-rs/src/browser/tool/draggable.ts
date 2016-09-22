import { Tool } from '../../browser/tool/tool';
import { ViewerEvent } from '../../browser/viewer/viewer-event';

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
 * DraggableTool is a base class for tools that handles mouse dragging over the Viewer.
 * This class manages a protected member "dragInfo", which holds handy values
 * such as the total mouse move distance from the drag start point.
 */
export abstract class DraggableTool extends Tool {

	/**
	 * Holds some useful drag-related variables.
	 */
	protected dragInfo: DragInfo;

	private prevX: number;
	private prevY: number;
	private startX: number;
	private startY: number;

	public dragStartHandler(ev: ViewerEvent): void {
		this.prevX = ev.viewerX;
		this.prevY = ev.viewerY;
		this.startX = ev.viewerX;
		this.startY = ev.viewerY;
		this.updateInfo(ev);
	}

	public dragHandler(ev: ViewerEvent): void {
		this.updateInfo(ev);
	}

	public dragEndHandler(ev: ViewerEvent): void {
		this.updateInfo(ev);
	}

	private updateInfo(ev: ViewerEvent): void {
		// Hack: For some reason, drag events can be called with zero screenX/Y values
		// when the mouse is released. We ignore such events by setting dx and dy to zero.
		if (ev.original.screenX === 0 && ev.original.screenY === 0) {
			this.dragInfo.dx = 0;
			this.dragInfo.dy = 0;
			return;
		}

		this.dragInfo = {
			dx: ev.viewerX - this.prevX,
			dy: ev.viewerY - this.prevY,
			totalDx: ev.viewerX - this.startX,
			totalDy: ev.viewerY - this.startY
		};
		this.prevX = ev.viewerX;
		this.prevY = ev.viewerY;
	}

}
