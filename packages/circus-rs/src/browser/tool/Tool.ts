import { EventEmitter } from 'events';
import ViewerEvent from '../../browser/viewer/ViewerEvent';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import { sign } from './tool-util';
import Viewer from '../viewer/Viewer';
import handlePageBy from './state/handlePageBy';
import handleZoomBy from './state/handleZoomBy';

export interface Tool extends ViewerEventTarget {
  activate(viewer: Viewer): void;
  deactivate(viewer: Viewer): void;
}

/**
 * A tool determines how a viewer intersects with various UI events.
 * An active tool will change the active view state of each viewer.
 */
export default class ToolBaseClass extends EventEmitter implements Tool {
  protected options: object = {};

  constructor() {
    super();
    this.wheelHandler = createPagerWheelHandler();
  }

  public activate(viewer: Viewer): void {}
  public deactivate(viewer: Viewer): void {}

  public setOptions(options: object): void {
    this.options = { ...this.setOptions, ...options };
  }

  public mouseUpHandler(viewerEvent: ViewerEvent): void {}
  public mouseDownHandler(viewerEvent: ViewerEvent): void {}
  public mouseMoveHandler(viewerEvent: ViewerEvent): void {}
  public dragStartHandler(viewerEvent: ViewerEvent): void {}
  public dragHandler(viewerEvent: ViewerEvent): void {}
  public dragEndHandler(viewerEvent: ViewerEvent): void {}
  public wheelHandler(viewerEvent: ViewerEvent): void {}
}

/**
 * The default mouse wheel handler, which performs paging.
 */
function createPagerWheelHandler(): (viewerEvent: ViewerEvent) => any {
  return ev => {
    const viewer = ev.viewer;
    const state = viewer.getState();

    switch (state.type) {
      case 'mpr': {
        const step = -sign(ev.original.deltaY) * (ev.original.ctrlKey ? 5 : 1);
        handlePageBy(ev.viewer, step);
        break;
      }
      case 'vr': {
        const speed = ev.original.shiftKey ? 0.05 : 0.01;
        handleZoomBy(viewer, -ev.original.deltaY * speed, [
          ev.viewerX!,
          ev.viewerY!
        ]);
        break;
      }
    }
  };
}
