'use strict';

import { Tool } from '../../browser/tool/tool';
import { ViewerEvent } from '../../browser/viewer/viewer-event';

type DragInfo = {
	dx: number;
	dy: number;
	ttldx: number;
	ttldy: number;
};

export abstract class DraggableTool extends Tool {

	private prevx: number;
	private prevy: number;
	private startx: number;
	private starty: number;
	private drag: boolean = false;

	public abstract dragstartHandler(ev: ViewerEvent);

	public abstract dragmoveHandler(ev: ViewerEvent, i: DragInfo);

	public abstract dragendHandler(ev: ViewerEvent, i: DragInfo);

	private info(x, y): DragInfo {
		return {
			dx: x - this.prevx,
			dy: y - this.prevy,
			ttldx: x - this.startx,
			ttldy: y - this.starty,
		};
	}

	public mousedownHandler(ev: ViewerEvent) {
		if (!this.drag) {
			this.drag = true;
			this.prevx = ev.viewerX;
			this.prevy = ev.viewerY;
			this.startx = ev.viewerX;
			this.starty = ev.viewerY;

			this.dragstartHandler(ev);
		}
	}

	public mousemoveHandler(ev: ViewerEvent) {
		if (this.drag) {
			let info = this.info(ev.viewerX, ev.viewerY);
			this.prevx = ev.viewerX;
			this.prevy = ev.viewerY;

			this.dragmoveHandler(ev, info);
		}
	}

	public mouseupHandler(ev: ViewerEvent) {
		if (this.drag) {

			this.drag = false;

			let info = this.info(ev.viewerX, ev.viewerY);
			this.dragendHandler(ev, info);
		}
	}
}
