'use strict';

import { Tool } from '../../browser/tool/tool';
import { ViewerEvent } from '../../browser/viewer/viewer-event';

interface DragInfo {
	dx: number;
	dy: number;
	ttldx: number;
	ttldy: number;
}

export abstract class DraggableTool extends Tool {

	private prevx: number;
	private prevy: number;
	private startx: number;
	private starty: number;
	private drag: boolean = false;

	public abstract dragStartHandler(ev: ViewerEvent): void;

	public abstract dragMoveHandler(ev: ViewerEvent, i: DragInfo): void;

	public abstract dragEndHandler(ev: ViewerEvent, i: DragInfo): void;

	private info(x, y): DragInfo {
		return {
			dx: x - this.prevx,
			dy: y - this.prevy,
			ttldx: x - this.startx,
			ttldy: y - this.starty,
		};
	}

	public mouseDownHandler(ev: ViewerEvent) {
		if (!this.drag) {
			this.drag = true;
			this.prevx = ev.viewerX;
			this.prevy = ev.viewerY;
			this.startx = ev.viewerX;
			this.starty = ev.viewerY;
			this.dragStartHandler(ev);
		}
	}

	public mouseMoveHandler(ev: ViewerEvent) {
		if (this.drag) {
			let info = this.info(ev.viewerX, ev.viewerY);
			this.prevx = ev.viewerX;
			this.prevy = ev.viewerY;
			this.dragMoveHandler(ev, info);
		}
	}

	public mouseUpHandler(ev: ViewerEvent) {
		if (this.drag) {
			this.drag = false;
			let info = this.info(ev.viewerX, ev.viewerY);
			this.dragEndHandler(ev, info);
		}
	}
}
