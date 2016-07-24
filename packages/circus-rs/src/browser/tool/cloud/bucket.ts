'use strict';

import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';
import { Tool } from '../../../browser/tool/tool';
import { CloudEditor } from '../../../browser/tool/cloud/cloud-editor';

export class BucketTool extends Tool implements ViewerEventTarget {

	private drawing: boolean = false;
	public cloudEditor: CloudEditor;

	constructor() {
		super();
	}

	public mouseDownHandler(ev: ViewerEvent) {
		if (this.cloudEditor) {
			this.cloudEditor.prepare(ev.viewer.getState());
			this.cloudEditor.fill(ev.viewerX, ev.viewerY);
			this.emit('filled');
			ev.stopPropagation();
		}
	}

}
