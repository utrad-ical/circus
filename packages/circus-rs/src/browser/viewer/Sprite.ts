import ViewerEvent from './ViewerEvent';
import ViewerEventTarget from '../../browser/interface/ViewerEventTarget';

export default class Sprite implements ViewerEventTarget {
  public mouseUpHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }

  public mouseDownHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }

  public mouseMoveHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }

  public dragStartHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }

  public dragHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }

  public dragEndHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }

  public wheelHandler(viewerEvent: ViewerEvent): void {
    // do nothing by default
  }
}
