import extend from 'extend';
import { EventEmitter } from 'events';
import Composition from '../Composition';
import ViewerEvent from './ViewerEvent';
import ViewState from '../ViewState';
import { ViewStateResizeTransformer } from '../image-source/ImageSource';
import { Tool } from '../tool/Tool';
import Annotation from '../annotation/Annotation';
import LoadingIndicator from '../interface/LoadingIndicator';
import defaultLoadingIndicator from './defaultLoadingIndicator';

/**
 * Viewer is the main component of CIRCUS RS, and wraps a HTML canvas element
 * and displays a specified image along with various annotations.
 * Displayed object is determined by `viewState` and `imageSource`.
 */
export default class Viewer extends EventEmitter {
  public canvas: HTMLCanvasElement;
  private rootDiv: HTMLDivElement;

  private viewState: ViewState | undefined;

  private composition: Composition | undefined;

  private activeTool: Tool | undefined = undefined;

  private cachedSourceImage: ImageData | undefined;

  private hoveringAnnotation: Annotation | undefined = undefined;

  private loadingIndicator: LoadingIndicator;

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
  private boundEventHandler: (event: MouseEvent) => void;

  private imageReady: boolean = false;
  private firstImageDrawn: boolean = false;

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

  private isObservingDivSize: boolean = false;

  /**
   * Change state when viewer size is changed. This function is provided by ImageSource.
   */
  private viewStateResizeTransformer: ViewStateResizeTransformer | undefined;

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    return canvas;
  }

  public resizeCanvas(): void {
    const canvas = this.canvas;
    const div = this.rootDiv;
    if (!canvas) throw new Error('Image viewer is not initialized');
    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;
  }

  constructor(div: HTMLDivElement) {
    super();

    if (!(div instanceof HTMLDivElement)) {
      throw new Error('Tried to create a viewer without a container');
    }

    // Removes everything which was already in the div
    div.innerHTML = '';
    const canvas = this.createCanvas();
    this.canvas = canvas;
    this.rootDiv = div;
    div.appendChild(canvas);
    this.resizeCanvas();

    this.boundEventHandler = this.canvasEventHandler.bind(this);

    canvas.addEventListener('mousedown', this.boundEventHandler);
    canvas.addEventListener('mouseup', this.boundEventHandler);
    canvas.addEventListener('mousemove', this.boundEventHandler);
    canvas.addEventListener('wheel', this.boundEventHandler);

    this.boundRender = this.render.bind(this);

    this.loadingIndicator = defaultLoadingIndicator;

    this.activateResizeObserver();
  }

  /**
   * Begin observation of wrapper element size.
   */
  private activateResizeObserver(): void {
    const div = this.rootDiv;
    let prevWidth = div.offsetWidth;
    let prevHeight = div.offsetHeight;
    const onNextFrame = () => {
      if (this.isObservingDivSize === false) return;
      if (prevWidth !== div.offsetWidth || prevHeight !== div.offsetHeight) {
        this.handleResize();
        prevWidth = div.offsetWidth;
        prevHeight = div.offsetHeight;
      }
      window.requestAnimationFrame(onNextFrame);
    };

    this.isObservingDivSize = true;
    window.requestAnimationFrame(onNextFrame);
  }

  private stopResizeObserver(): void {
    this.isObservingDivSize = false;
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
    const documentElement = document.documentElement as HTMLElement;

    // Emulate "drag and drop" events by swapping the event type
    if (eventType === 'mousedown') {
      eventType = 'dragstart';
      this.isDragging = true;

      // register additional mouse handlers to listen events outside of canvas while dragging
      this.canvas.removeEventListener('mouseup', this.boundEventHandler);
      this.canvas.removeEventListener('mousemove', this.boundEventHandler);
      documentElement.addEventListener('mouseup', this.boundEventHandler);
      documentElement.addEventListener('mousemove', this.boundEventHandler);
    } else if (this.isDragging) {
      if (eventType === 'mouseup') {
        eventType = 'dragend';
        this.isDragging = false;

        this.canvas.addEventListener('mouseup', this.boundEventHandler);
        this.canvas.addEventListener('mousemove', this.boundEventHandler);
        documentElement.removeEventListener(
          'mousemove',
          this.boundEventHandler
        );
        documentElement.removeEventListener('mouseup', this.boundEventHandler);
      } else if (eventType === 'mousemove') {
        eventType = 'drag';
        originalEvent.preventDefault();
      }
    }

    const event = new ViewerEvent(this, eventType, originalEvent);

    // Cancel default behavior by default for wheel events
    if (eventType === 'wheel') originalEvent.preventDefault();

    if (this.primaryEventTarget) {
      event.dispatch(this.primaryEventTarget);
    }
    for (const annotation of [...this.composition.annotations].reverse()) {
      event.dispatch(annotation);
    }
    if (this.backgroundEventTarget) {
      event.dispatch(this.backgroundEventTarget);
    }
  }

  public setHoveringAnnotation(anno: Annotation | undefined): void {
    this.hoveringAnnotation = anno;
  }

  public getHoveringAnnotation(): Annotation | undefined {
    return this.hoveringAnnotation;
  }

  public setCursorStyle(cursor: string): void {
    this.canvas.style.cursor = cursor;
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
    for (const annotation of comp.annotations) {
      annotation.draw(this, viewState, {
        hover: this.hoveringAnnotation === annotation
      });
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
      const src = this.composition!.imageSource;
      return src.draw(this, state).then(image => {
        this.cachedSourceImage = image;
        this.currentRender = null;
        this.renderAnnotations(state);
        this.firstImageDrawn = true;
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
    const prevState = extend(true, {}, this.viewState);
    this.viewState = extend(true, {}, state);
    this.emit('stateChange', prevState, state);
    this.render();
    return prevState;
  }

  /**
   * Returns the current view state.
   */
  public getState(): ViewState {
    return extend(true, {}, this.viewState);
  }

  private detachCurrentComposition(): void {
    if (!this.composition) return;
    this.composition.removeListener('viewerChange', this.boundRender);
    this.composition.unregisterViewer(this);
    this.composition = undefined;
  }

  /**
   * Sets the loading indicator.
   * @param indicator The loading indicator.
   */
  public setLoadingIndicator(indicator: LoadingIndicator) {
    this.loadingIndicator = indicator;
  }

  /**
   * ImageSource handling methods
   */
  public setComposition(composition: Composition): void {
    if (this.composition === composition) return;
    if (this.composition) {
      this.cancelNextRender();
      this.detachCurrentComposition();
    }
    this.composition = composition;
    this.composition.registerViewer(this);
    this.imageReady = false;
    this.firstImageDrawn = false;

    // Loading indicator
    const drawLoadingIndicator = (time: number) => {
      if (this.firstImageDrawn) return;
      const ctx = this.canvas.getContext('2d')!;
      this.loadingIndicator(ctx, time);
      requestAnimationFrame(drawLoadingIndicator);
    };
    requestAnimationFrame(drawLoadingIndicator);

    // Wait for image source to be ready
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

  public setActiveTool(tool: Tool | undefined): void {
    const before = this.activeTool;
    if (tool === before) return;
    if (before) before.deactivate(this);
    if (tool) tool.activate(this);
    this.activeTool = tool;

    this.emit('toolchanged', before, this.activeTool);
  }

  public getActiveTool(): Tool | undefined {
    return this.activeTool;
  }

  public handleResize(): void {
    const transformer = this.viewStateResizeTransformer;
    if (transformer) {
      const div = this.rootDiv;
      const newResolution: [number, number] = [
        div.offsetWidth,
        div.offsetHeight
      ];
      const state = this.getState();
      const newState = transformer(state, this.getResolution(), newResolution);
      this.setState(newState);
    }
    this.resizeCanvas();
  }

  /**
   * Dispose viewer
   */
  public dispose(): void {
    this.cancelNextRender();
    this.detachCurrentComposition();
    this.stopResizeObserver();
    this.removeAllListeners();
  }
}
