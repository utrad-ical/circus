import Viewer from './Viewer';

export default class ViewerEvent {
  public type: string;
  public original: any;

  public viewerX?: number;
  public viewerY?: number;
  public viewerWidth?: number;
  public viewerHeight?: number;

  public viewer: Viewer;

  constructor(viewer: Viewer, type: string, original?: any) {
    this.viewer = viewer;
    this.type = type || (original ? original.type : null);

    if (original && 'offsetX' in original) {
      const [viewerWidth, viewerHeight] = viewer.getResolution();
      const [elementWidth, elementHeight] = viewer.getViewport();

      const rect = viewer.canvas.getBoundingClientRect(); // in window coordinate
      const offsetX = original.pageX - rect.left - window.scrollX;
      const offsetY = original.pageY - rect.top - window.scrollY;

      this.viewerX = offsetX * viewerWidth / elementWidth;
      this.viewerY = offsetY * viewerHeight / elementHeight;
      this.viewerWidth = viewerWidth;
      this.viewerHeight = viewerHeight;
    }

    this.original = original;
  }

  public stopPropagation(): void {
    this.original.stopPropagation();
  }

  public dispatch(element: any): void {
    const normalizedEventName = this.type.replace(
      /^(mouse|drag)([a-z])/,
      (m, p1, p2) => p1 + p2.toUpperCase()
    );
    const handler = normalizedEventName + 'Handler';
    if (typeof element[handler] === 'function') {
      const retVal = element[handler](this);
      if (retVal === false) this.original.preventDefault();
    }
  }
}
