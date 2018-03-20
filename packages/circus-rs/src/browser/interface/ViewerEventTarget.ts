import ViewerEvent from '../../browser/viewer/ViewerEvent';

export default interface ViewerEventTarget {
  mouseUpHandler: (viewerEvent: ViewerEvent) => any;
  mouseDownHandler: (viewerEvent: ViewerEvent) => any;
  mouseMoveHandler: (viewerEvent: ViewerEvent) => any;
  dragStartHandler: (viewerEvent: ViewerEvent) => any;
  dragHandler: (viewerEvent: ViewerEvent) => any;
  dragEndHandler: (viewerEvent: ViewerEvent) => any;
  wheelHandler: (viewerEvent: ViewerEvent) => any;
}
