import Viewer from './Viewer';

export default class ViewerEvent {
  public type: string;
  public original: any;

  public viewerX?: number;
  public viewerY?: number;
  public viewerWidth?: number;
  public viewerHeight?: number;
  public movementX?: number;
  public movementY?: number;

  public viewer: Viewer;

  private propagation: boolean;

  constructor(viewer: Viewer, type: string, original?: any) {
    this.viewer = viewer;
    this.type = type || (original ? original.type : null);
    this.propagation = true;

    const isTouchEvent = original instanceof TouchEvent;
    if (original && ('offsetX' in original || isTouchEvent)) {
      const [viewerWidth, viewerHeight] = viewer.getResolution();
      const [elementWidth, elementHeight] = viewer.getViewport();
      const { pageX, pageY } = isTouchEvent
        ? original.changedTouches[0]
        : original;
      const rect = viewer.canvas.getBoundingClientRect(); // in window coordinate
      const offsetX = pageX - rect.left - window.scrollX;
      const offsetY = pageY - rect.top - window.scrollY;

      this.viewerX = (offsetX * viewerWidth) / elementWidth;
      this.viewerY = (offsetY * viewerHeight) / elementHeight;
      this.viewerWidth = viewerWidth;
      this.viewerHeight = viewerHeight;
      if (!isTouchEvent) {
        this.movementX = original.movementX;
        this.movementY = original.movementY;
      }
    }
    this.original = original;
  }

  public stopPropagation(): void {
    this.original.stopPropagation();
    this.propagation = false;
  }

  public dispatch(element: any): void {
    if (!this.propagation) return;

    const normalizedEventName = this.type.replace(
      /^(mouse|drag)([a-z])/,
      (m, p1, p2) => p1 + p2.toUpperCase()
    );
    const handler = normalizedEventName + 'Handler';
    if (typeof element[handler] === 'function') {
      const retVal = element[handler](this);
      if (retVal === undefined) this.original.preventDefault();
    }
  }
}
