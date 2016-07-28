'use strict'

import { Viewer } from './viewer'

export class ViewerEvent {
	public type: string;
	public original: any;

	public viewerX: number;
	public viewerY: number;
	public viewerWidth: number;
	public viewerHeight: number;

	private propagation: boolean;

	public viewer: Viewer;

	constructor(viewer: Viewer, type: string, original?: any) {
		this.viewer = viewer;
		this.type = type || ( original ? original.type : null );

		if (original && original.offsetX) {
			const canvas = viewer.canvas;
			const [ viewerWidth, viewerHeight ] = viewer.getResolution();
			const [ elementWidth, elementHeight ] = viewer.getViewport();

			this.viewerX = original.offsetX * viewerWidth / elementWidth;
			this.viewerY = original.offsetY * viewerHeight / elementHeight;
			this.viewerWidth = viewerWidth;
			this.viewerHeight = viewerHeight;
		}

		this.original = original;
		this.propagation = true;
	}

	public stopPropagation() {
		this.propagation = false;
		if (this.original) {
			this.original.stopPropagation();
			this.original.preventDefault();
		}
	}

	public dispatch(element) {
		const normalizedEvent = this.type.replace(
			/^(mouse|drag)([a-z])/,
			(m, p1, p2) => p1 + p2.toUpperCase()
		);
		const handler = normalizedEvent + 'Handler';
		if (this.propagation && element && typeof element[handler] === 'function') {
			const retval = element[handler](this);
			if (retval === false) this.stopPropagation();
		}
	}
}
