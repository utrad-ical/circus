'use strict';

import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';
import { Tool } from '../../../browser/tool/tool';
import { CloudEditor } from '../../../browser/tool/cloud/cloud-editor';

export class BrushTool extends Tool implements ViewerEventTarget {

	private drawing: boolean = false;
	public cloudEditor: CloudEditor;

	constructor() {
		super();
	}

	public mousedownHandler(ev: ViewerEvent) {
		if (this.cloudEditor && !this.drawing) {
			ev.stopPropagation();

			ev.viewer.primaryEventTarget = this;
			this.drawing = true;

			this.cloudEditor.prepare(ev.viewer.viewState);
			this.cloudEditor.moveTo(ev.viewerX, ev.viewerY);
			this.cloudEditor.lineTo(ev.viewerX, ev.viewerY);

			this.emit('pendown', this);
		}
	}

	public mousemoveHandler(ev: ViewerEvent) {

		if (this.cloudEditor && this.drawing) {
			ev.stopPropagation();

			this.cloudEditor.lineTo(ev.viewerX, ev.viewerY);
			ev.viewer.render();
			this.emit('penmove', this);
		}
	}

	public mouseupHandler(ev: ViewerEvent) {

		if (this.drawing) {
			this.drawing = false;
			ev.stopPropagation();
			ev.viewer.primaryEventTarget = null;

			this.emit('penup', this);
		}
	}

}

