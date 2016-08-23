import { Tool } from '../../browser/tool/tool';
import { ViewerEvent } from '../../browser/viewer/viewer-event';

/**
 * DragInfo holds convenient data while dragging.
 */
export interface DragInfo {
	dx: number;
	dy: number;
	totalDx: number;
	totalDy: number;
}

/**
 * DraggableTool is a base class for tools that handles drag and drop.
 * This class manages a protected member "dragInfo", which holds handy values
 * such as the total mouse move distance from the drag start point.
 */
export abstract class DraggableTool extends Tool {

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
		// when the mouse is released. We ignore such events altogether.
		if (ev.original.screenX === 0 && ev.original.screenY == 0) {
			this.dragInfo.dx = 0;
			this.dragInfo.dy = 0;
			return;
		}

		this.dragInfo = {
			dx: ev.viewerX - this.prevX,
			dy: ev.viewerY - this.prevY,
			totalDx: ev.viewerX - this.startX,
			totalDy: ev.viewerY - this.startY,
		};
		this.prevX = ev.viewerX;
		this.prevY = ev.viewerY;
	}

}
