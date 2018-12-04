import { EventEmitter } from 'events';
import ViewerEvent from '../../browser/viewer/ViewerEvent';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import { sign } from './tool-util';
import MprImageSource from '../image-source/MprImageSource';
import { orientationAwareTranslation } from '../section-util';
import Viewer from '../viewer/Viewer';

export interface Tool extends ViewerEventTarget {
  activate(viewer: Viewer): void;
  deactivate(viewer: Viewer): void;
}

/**
 * A tool determines how a viewer intersects with various UI events.
 * An active tool will change the active view state of each viewer.
 */
export default class ToolBaseClass extends EventEmitter implements Tool {
  constructor() {
    super();
    this.wheelHandler = createPagerWheelHandler();
  }

  public activate(viewer: Viewer) {}
  public deactivate(viewer: Viewer) {}

  public mouseUpHandler(viewerEvent: ViewerEvent) {}
  public mouseDownHandler(viewerEvent: ViewerEvent) {}
  public mouseMoveHandler(viewerEvent: ViewerEvent) {}
  public dragStartHandler(viewerEvent: ViewerEvent) {}
  public dragHandler(viewerEvent: ViewerEvent) {}
  public dragEndHandler(viewerEvent: ViewerEvent) {}
  public wheelHandler(viewerEvent: ViewerEvent) {}
}

/**
 * The default mouse wheel handler, which performs paging.
 */
function createPagerWheelHandler(): (viewerEvent: ViewerEvent) => any {
  return ev => {
    const viewer = ev.viewer;
    const state = viewer.getState();

    switch (state.type) {
      case 'mpr':
        const step = -sign(ev.original.deltaY) * (ev.original.ctrlKey ? 5 : 1);
        const comp = viewer.getComposition();
        if (!comp) throw new Error('Composition not initialized'); // should not happen
        const src = comp.imageSource as MprImageSource;
        if (!src.metadata) return;
        const voxelSize = src.metadata.voxelSize;
        state.section = orientationAwareTranslation(
          state.section,
          voxelSize,
          step
        );
        viewer.setState(state);
        break;
      case 'vr':
        const speed = ev.original.shiftKey ? 0.005 : 0.002;
        const zoom =
          typeof state.zoom !== 'undefined'
            ? state.zoom + ev.original.deltaY * speed * -1
            : 1.0;
        viewer.setState({ ...state, zoom });
        break;
    }
  };
}
