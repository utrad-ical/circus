import * as extend from 'extend';
import { EventEmitter } from 'events';
import Sprite from './Sprite';
import Composition from '../Composition';
import ViewerEvent from './ViewerEvent';
import ViewState from '../ViewState';
import Tool from '../tool/Tool';
import { toolFactory } from '../tool/tool-initializer';
import { ViewStateResizeTransformer } from '../image-source/ImageSource';

/**
 * Viewer is the main component of CIRCUS RS, and wraps a HTML canvas element
 * and displays a specified image along with various annotations.
 * Displayed object is determined by `viewState` and `imageSource`.
 */
export default class Viewer extends EventEmitter {
  public canvas: HTMLCanvasElement;

  private viewState: ViewState | undefined;

  private composition: Composition | undefined;

  private activeTool: Tool | undefined;
  private activeToolName: string | undefined;

  private sprites: Sprite[];

  private cachedSourceImage: ImageData | undefined;

  /**
   * primaryEventTarget captures all UI events happened within the canvas
   * before other elements handle this, typically while dragging.
   */
  public primaryEventTarget: any;

  /**
   * backgroundEventTarget handles all UI events after other elements.
   */
  public backgroundEventTarget: any;

  private boundRender: EventListener;
  private boundEventHandler: EventListener;

  private imageReady: boolean = false;

  private isDragging: boolean = false;

  /**
   * When render() is called while there is already another rendering procedure in progress,
   * We will keep that render Promise with a "suspended" status.
   * After the current rendering is finished, the last suspended one will be used.
   * This can prevent the imageSource's draw() method from being called too frequently.
   */
  private nextRender: Promise<any> | null = null;

  /**
   * Holds the current rendering promise which is actually processing ImageSource#draw().
   */
  private currentRender: Promise<any> | null = null;

  private observingDivSize: boolean = false;

  /**
   * Change state when viewer size is changed. This function is provided by ImageSource.
   */
  private viewStateResizeTransformer: ViewStateResizeTransformer | undefined;

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    return canvas;
  }

  public resizeCanvas(): void {
    const canvas = this.canvas;
    if (!canvas) throw new Error('Image viewer is not initialized');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  constructor(div: HTMLDivElement) {
    super();

    if (!(div instanceof HTMLDivElement)) {
      throw new Error('Tried to create a viewer without a container');
    }

    if (div.clientWidth <= 0 || div.clientHeight <= 0) {
      throw new Error('The container div has zero width or height.');
    }

    // Removes everything which was already in the div
    div.innerHTML = '';
    const canvas = this.createCanvas();
    this.canvas = canvas;
    div.appendChild(canvas);
    this.resizeCanvas();

    this.sprites = [];

    this.boundEventHandler = this.canvasEventHandler.bind(this);

    canvas.addEventListener('mousedown', this.boundEventHandler);
    canvas.addEventListener('mouseup', this.boundEventHandler);
    canvas.addEventListener('mousemove', this.boundEventHandler);
    canvas.addEventListener('wheel', this.boundEventHandler);

    this.boundRender = this.render.bind(this);

    this.setActiveTool('null');

    this.activateResizeObserver(div);
  }

  /**
   * Begin observation of wrapper element size.
   * @param div
   */
  private activateResizeObserver(div: HTMLDivElement): void {
    let wrapSize: [number, number] = [div.offsetWidth, div.offsetHeight];
    const onNextFrame = (_frameTime: number) => {
      if (this.observingDivSize === false) return;

      if (wrapSize[0] !== div.offsetWidth || wrapSize[1] !== div.offsetHeight) {
        wrapSize = [div.offsetWidth, div.offsetHeight];
        this.onResize();
      }

      window.requestAnimationFrame(onNextFrame);
    };

    this.observingDivSize = true;
    window.requestAnimationFrame(onNextFrame);
  }

  private stopResizeObserver(): void {
    this.observingDivSize = false;
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

  private canvasEventHandler(originalEvent: MouseEvent): void {
    // Suppress all event when the viewer is not initialized
    if (!this.composition || !this.viewState) return;

    let eventType = originalEvent.type;

    // Emulate "drag and drop" events by swapping the event type
    if (eventType === 'mousedown') {
      this.isDragging = true;
      // register additional mouse handlers to listen events outside of canvas while dragging
      this.canvas.removeEventListener('mouseup', this.boundEventHandler);
      this.canvas.removeEventListener('mousemove', this.boundEventHandler);
      document.documentElement.addEventListener(
        'mousemove',
        this.boundEventHandler
      );
      document.documentElement.addEventListener(
        'mouseup',
        this.boundEventHandler
      );
      eventType = 'dragstart';
    } else if (this.isDragging) {
      if (eventType === 'mouseup') {
        this.canvas.addEventListener('mouseup', this.boundEventHandler);
        this.canvas.addEventListener('mousemove', this.boundEventHandler);
        document.documentElement.removeEventListener(
          'mousemove',
          this.boundEventHandler
        );
        document.documentElement.removeEventListener(
          'mouseup',
          this.boundEventHandler
        );
        this.isDragging = false;
        eventType = 'dragend';
      } else if (eventType === 'mousemove') {
        originalEvent.preventDefault();
        eventType = 'drag';
      }
    }

    const event = new ViewerEvent(this, eventType, originalEvent);

    // Cancel default behavior by default for wheel events
    if (eventType === 'wheel') originalEvent.preventDefault();

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

  /**
   * Synchronously draws the image fetched from the image source, along with
   * all the annotations associated with the composition.
   * This function is automatically called when ImageSource.draw() has finished,
   * but can be called arbitrary times when annotations are updated.
   * This function does nothing when ImageSource.draw() is in progress
   * (i.e., this.currentRender is not empty).
   */
  public renderAnnotations(viewState: ViewState | null = null): void {
    if (this.currentRender) {
      // Re-drawing annotations should be done when we are not waiting
      // for the image source to draw.
      return;
    }
    if (!viewState) viewState = this.viewState || null;
    const comp = this.composition;
    if (!viewState || !comp) return;
    if (this.cachedSourceImage)
      this.renderImageDataToCanvas(this.cachedSourceImage);
    for (let annotation of comp.annotations) {
      const sprite = annotation.draw(this, viewState);
      if (sprite instanceof Sprite) this.sprites.push(sprite);
    }
  }

  private renderImageDataToCanvas(image: ImageData): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context.');
    ctx.putImageData(image, 0, 0);
  }

  /**
   * Requests the rendering of the viewer using the current view state.
   * This can be called very frequently (eg, 60 times/sec),
   * but it may not trigger the actual rendering procedure because
   * you cannot have more than one rendering paths running simultaneously.
   * The returned promise will be rejected when this request was skipped.
   * @return {Promise<boolean>} A promise object that resolves with a
   * boolean indicating whether actual rendering happened (true) or not (false).
   */
  public render(): Promise<boolean> {
    // Wait only if there is another render() in progress
    let waiter: Promise<any> = Promise.resolve();
    if (!this.composition) {
      return Promise.reject(new Error('Composition not set'));
    }
    if (this.composition.imageSource === null) {
      return Promise.reject(new Error('Composition not initialized'));
    }
    if (!this.imageReady) waiter = this.composition.imageSource.ready();
    if (this.currentRender) waiter = waiter.then(() => this.currentRender);
    const p: Promise<boolean> = waiter.then(() => {
      const state = this.viewState;
      if (!state) throw new Error('View state not initialized');
      // Now there is no rendering in progress.
      if (p !== this.nextRender) {
        // I am expired because another render() method was called after this
        return false;
      }
      // I am the most recent render() call.
      // It's safe to call draw() now.
      this.currentRender = p;
      this.nextRender = null;
      const src = (<Composition>this.composition).imageSource;
      return src.draw(this, state).then(image => {
        this.cachedSourceImage = image;
        this.currentRender = null;
        this.renderAnnotations(state);
        this.emit('draw', this.viewState);
        return true;
      });
    });
    // Remember this render() call as the most recent one,
    // possibly overwriting and expiring the previous nextRender
    this.nextRender = p;
    return p;
  }

  /**
   * Cancels the render
   */
  public cancelNextRender(): void {
    this.nextRender = null;
  }

  /**
   * Sets the view state and re-renders the viewer.
   */
  public setState(state: ViewState): void {
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
  public setComposition(composition: Composition): void {
    if (this.composition === composition) return;
    if (this.composition) {
      this.cancelNextRender();
      this.composition.removeListener('viewerChange', this.boundRender);
      this.composition.unregisterViewer(this);
    }
    this.composition = composition;
    this.composition.registerViewer(this);
    this.imageReady = false;
    composition.imageSource.ready().then(() => {
      this.imageReady = true;
      this.setState(composition.imageSource.initialState(this));
      this.viewStateResizeTransformer = composition.imageSource.getResizeTransformer();
      this.emit('imageReady');
    });
    this.composition.addListener('viewerChange', this.boundRender);
    this.emit('compositionChange', composition);
  }

  public getComposition(): Composition | undefined {
    return this.composition;
  }

  public setActiveTool(toolName: string): void {
    const before = this.activeTool;
    const tool = toolFactory(toolName);
    if (tool === undefined) throw new TypeError('Unknown tool: ' + toolName);

    this.activeTool = tool;

    // set this tool as the background event target
    // which handles UI events after other sprites
    this.backgroundEventTarget = this.activeTool;

    this.activeToolName = toolName;
    this.emit('toolchange', before, toolName);
  }

  public getActiveTool(): string | undefined {
    return this.activeToolName;
  }

  /**
   * Fit canvas size to it's wrapper element.
   * Observer calls this.
   */
  public onResize(): void {
    const transformer = this.viewStateResizeTransformer;
    if (transformer) {
      const div = this.canvas.parentElement as HTMLElement;
      const newResolution: [number, number] = [
        div.offsetWidth,
        div.offsetHeight
      ];

      const state = this.getState();
      const newState = transformer(state, this.getResolution(), newResolution);

      if (state !== newState) {
        this.resizeCanvas();
        this.setState(newState);
      }
    }
  }

  /**
   * Dispose viewer
   */
  public dispose(): void {
    this.stopResizeObserver();
    this.cancelNextRender();
  }
}
