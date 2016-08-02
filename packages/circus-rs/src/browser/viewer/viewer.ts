'use strict';

var extend = require('extend');

import { EventEmitter } from 'events';
import { Annotation } from '../../browser/annotation/annotation';
import { Sprite } from '../../browser/viewer/sprite';
import { Composition } from '../../browser/composition';
import { ViewerEvent } from '../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../browser/interface/viewer-event-target';
import { ViewState } from '../view-state';
import { Tool } from '../tool/tool';
import { toolFactory } from '../tool/tool-initializer';

const DEFAULT_VIEWER_WIDTH = 512;
const DEFAULT_VIEWER_HEIGHT = 512;

/**
 * Viewer is the main component of CIRCUS RS, and wraps a HTML canvas element
 * and displays a specified image along with various annotations.
 * Displayed object is determined by `viewState` and `imageSource`.
 */
export class Viewer extends EventEmitter {

	public canvas: HTMLCanvasElement;
	private viewState: ViewState;
	private composition: Composition;

	private activeTool: Tool;
	private activeToolName: string;

	// private painters: Painter[];
	private sprites: Sprite[];

	/**
	 * primaryEventTarget captures all UI events happened within the canvas
	 * before other elements handle this, typically while dragging.
	 */
	public primaryEventTarget;

	/**
	 * backgroudnEventTarget handles all UI events after other elements.
	 */
	public backgroundEventTarget;

	private boundRender: Function;

	private imageReady: boolean = false;

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

	private createCanvas(width, height): HTMLCanvasElement {
		const elm =  document.createElement('canvas');
		elm.setAttribute('width', width);
		elm.setAttribute('height', height);
		return elm;
	}

	constructor(div: HTMLDivElement) {
		super();

		if (!(div instanceof HTMLDivElement)) {
			throw new Error('Tried to create a viewer without a container');
		}

		// Removes everything which was already in the div
		div.innerHTML = '';
		const canvas = this.createCanvas(
			DEFAULT_VIEWER_WIDTH,
			DEFAULT_VIEWER_HEIGHT
		);
		div.appendChild(canvas);

		this.canvas = canvas;
		this.sprites = [];

		const handler = this.canvasEventHandler.bind(this);

		const wheelEvent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
		canvas.addEventListener('mousedown', handler);
		canvas.addEventListener('mouseup', handler);
		canvas.addEventListener('mousemove', handler);
		canvas.addEventListener(wheelEvent, handler);

		this.boundRender = this.render.bind(this);

		this.setActiveTool('null');
	}

	public getViewport(): [number, number] {
		return [this.canvas.clientWidth, this.canvas.clientHeight];
	}

	public getResolution(): [number, number] {
		return [this.canvas.width, this.canvas.height];
	}

	public setResolution(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
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

		const event = new ViewerEvent(this, eventType, originalEvent);
		if (this.primaryEventTarget) {
			event.dispatch(this.primaryEventTarget);
		}
		for (let sprite of this.sprites) {
			event.dispatch(sprite);
		}
		if (this.backgroundEventTarget) {
			event.dispatch(this.backgroundEventTarget);
		}
	}

	public createEvent(eventType, originalEvent?) {
		return new ViewerEvent(this, eventType, originalEvent);
	}

	private clear(): void {
		this.canvas.getContext('2d').clearRect(
			0, 0, this.canvas.width, this.canvas.height
		);
	}

	/**
	 * Requests the rendering of the viewer using the current view state.
	 * This can be called very frequently (eg, 60 times/sec),
	 * but it may not trigger the actual rendering procedure because
	 * you cannot have more than one rendering paths running simultaneously.
	 * The returned promise will be rejected when this request was skipped.
	 * @return {Promise<boolean>} A promise object that resolves with a
	 * boolean indicating whther actual rendering happened (true) or not (false).
	 */
	public render(): Promise<boolean> {
		// Wait only if there is another render() in progress
		let waiter: any = Promise.resolve();
		if (!this.imageReady) waiter = this.composition.imageSource.ready();
		if (this.currentRender) waiter = waiter.then(this.currentRender);
		const p: Promise<boolean> = waiter.then(() => {
			const canvas = this.canvas;
			const state = this.viewState;
			// Now there is no rendering in progress.
			if (p !== this.nextRender) {
				// I am expired because another render() method was called after this
				return Promise.resolve(false);
			}
			// I am the most recent render() call.
			// It's safe to call draw() now.
			this.currentRender = p;
			this.nextRender = null;
			const src = this.composition.imageSource;
			return src.draw(this, state).then(res => {
				for (let annotation of this.composition.getAnnotations()) {
					const sprite = annotation.draw(this, state);
					if (sprite !== null) this.sprites.push(sprite);
				};
				this.currentRender = null;
				return true;
			});
		});
		// Remember this render() call as the most recent one,
		// possibly overwriting and expiring the previous nextRender
		this.nextRender = p;
		return p;
	}

	/**
	 * Sets the view state and re-renders the viewer.
	 */
	public setState(state: ViewState) {
		let prevState = extend(true, {}, this.viewState);
		this.viewState = extend(true, {}, state);
		this.emit('statechange', prevState, state);
		this.render();
		return prevState;
	}

	/**
	 * Returns the current view state.
	 */
	public getState(): ViewState {
		return extend(true, {}, this.viewState);
	}

	/**
	 * ImageSource handling methods
	 */
	public setComposition(composition: Composition) {
		if (this.composition === composition) return;
		if (this.composition) {
			this.composition.unregisterViewer(this);
			this.composition.removeListener('change', this.boundRender);
		}
		this.composition = composition;
		this.composition.registerViewer(this);
		this.imageReady = false;
		composition.imageSource.ready().then(() => {
			this.imageReady = true;
			this.setState(composition.imageSource.initialState(this));
		});
		this.composition.addListener('change', this.boundRender);
		this.emit('compositionChange', composition);
	}

	public getComposition(): Composition {
		return this.composition;
	}

	public setActiveTool(toolName: string): void {
		const before = this.activeTool;
		const tool = toolFactory(toolName);
		if (tool === undefined)
			throw new TypeError('Unknown tool: ' + toolName);

		this.activeTool = tool;

		// set this tool as the background event target
		// which handles UI events after other sprites
		this.backgroundEventTarget = this.activeTool;

		this.activeToolName = toolName;
		this.emit('toolchange', before, toolName);
	}

	public getActiveTool(): string {
		return this.activeToolName;
	}

}
