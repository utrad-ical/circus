'use strict';

var extend = require('extend');
import { EventEmitter } from 'events';

import { Painter } from '../../browser/interface/painter';
import { Sprite } from '../../browser/viewer/sprite';
import { ImageSource } from '../../browser/image-source/image-source';
import { ViewerEvent } from '../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../browser/interface/viewer-event-target';

/**
 * Viewer is the main component of CIRCUS RS, and wraps a HTML canvas element
 * and displays a specified image along with various annotations.
 * Displayed object is determined by `viewState` and `imageSource`.
 */
export class Viewer extends EventEmitter {

	public canvasDomElement: HTMLCanvasElement;

	public viewState: any;
	public imageSource: ImageSource;
	public painters: Painter[];
	public sprites: Sprite[];

	public primaryEventTarget;
	public backgroundEventTarget;

	/**
	 * When render() is called while there is already another rendering procedure in progress,
	 * We will keep that render Promise with a "suspended" status.
	 * After the current rendering is finished, the last suspended one will be used.
	 * This can prevent the imageSource's draw() method from being called too frequently.
	 */
	private nextRender: Promise<any> = null;

	/**
	 * Holds the current rendering promise which is actually processing ImageSource#draw().
	 */
	private currentRender: Promise<any> = null;

	constructor(canvas: HTMLCanvasElement) {
		super();

		this.canvasDomElement = canvas;
		this.painters = [];
		this.sprites = [];

		const handler = this.canvasEventHandler.bind(this);

		const wheelEvent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
		canvas.addEventListener('mousedown', handler);
		canvas.addEventListener('mouseup', handler);
		canvas.addEventListener('mousemove', handler);
		canvas.addEventListener(wheelEvent, handler);

		this.viewState = {
			resolution: this.getResolution(),
			viewport: this.getViewport()
		};

	}

	public getViewport() {
		return [
			this.canvasDomElement.clientWidth,
			this.canvasDomElement.clientHeight
		];
	}

	public getResolution() {
		return [
			Number(this.canvasDomElement.getAttribute('width')),
			Number(this.canvasDomElement.getAttribute('height'))
		];
	}

	public setResolution(w, h) {
		this.canvasDomElement.setAttribute('width', w);
		this.canvasDomElement.setAttribute('height', h);
	}

	public addPainter(p: Painter) {
		this.painters.push(p);
	}

	public removePainter(p: Painter) {
		const currentCount = this.painters.length;
		this.painters = this.painters.filter(i => i !== p);
		return this.painters.length !== currentCount;
	}

	private canvasEventHandler(originalEvent) {
		if (typeof originalEvent === 'object' && originalEvent.preventDefault) {
			originalEvent.preventDefault();
		}

		let eventType = originalEvent.type;
		switch (eventType) {
			case 'mousemove':
			case 'mouseup':
			case 'mousedown':
				break;
			case 'wheel':
			case 'mousewheel':
			case 'DOMMouseScroll':
				eventType = 'mousewheel';
				break;
		}

		let event = new ViewerEvent(this, eventType, originalEvent);
		if (this.primaryEventTarget) event.dispatch(this.primaryEventTarget);
		for (let i = this.sprites.length; i > 0; i--) {
			event.dispatch(this.sprites[i - 1]);
		}
		if (this.backgroundEventTarget) event.dispatch(this.backgroundEventTarget);
	}

	public createEvent(eventType, originalEvent?) {
		return new ViewerEvent(this, eventType, originalEvent);
	}

	public clear(): void {
		this.canvasDomElement.getContext('2d').clearRect(
			0, 0,
			Number(this.canvasDomElement.getAttribute('width')),
			Number(this.canvasDomElement.getAttribute('height'))
		);
	}

	public drawBy(painter: Painter): void {
		let sprite = painter.draw(this.canvasDomElement, this.viewState);
		if (sprite) this.sprites.push(sprite);
	}

	public render(): Promise<any> {
		const state = this.viewState;
		const canvas = this.canvasDomElement;

		// Wait only if there is another render() in progress
		const waiter = this.currentRender || Promise.resolve();
		const p = waiter.then(() => {
			// Now there is no rendering in progress.
			if (p !== this.nextRender) {
				// Another render() method was called after this, so I am expired...
				return null;
			}
			// I am the most recent render() call.
			// It's safe to call draw() now.
			this.currentRender = p;
			this.nextRender = null;
			return this.imageSource.draw(canvas, state).then(res => {
				this.painters.forEach(painter => {
					const sprite = painter.draw(canvas, state);
					if (sprite !== null) this.sprites.push(sprite);
				});
				this.currentRender = null;
				return res;
			});
		});
		// Remember this render() call as the most recent one,
		// possibly overwriting and expiring the previous nextRender
		this.nextRender = p;
		return p;
	}


	/**
	 * State handling methods
	 */
	public setState(state) {
		let prevState = extend(true, {}, this.viewState);
		this.viewState = extend(true, {}, state);
		this.emit('statechange', prevState, state);
		return prevState;
	}

	public getState() {
		return extend(true, {}, this.viewState);
	}

	/**
	 * ImageSource handling methods
	 */
	public setSource(source: ImageSource) {
		let prevSource = this.imageSource;
		this.imageSource = source;
		this.emit('sourcechange', prevSource, source);
		return prevSource;
	}

	public getSource() {
		return this.imageSource;
	}

	public dumpState() {
		const getIndent = (indent) => {
			let space = '';
			while (indent-- > 0) {
				space += ' ';
			}
			return space;
		};
		const recursive = (o, indent) => {
			if (typeof o === 'object') {
				let dump = "\n";
				for (let i in o) {
					dump += getIndent(indent) + i + ": " + recursive(o[i], indent + 1);
				}
				return dump;
			} else {
				return o + "\n";
			}
		};
		return recursive(this.viewState, 0);
	}

}
