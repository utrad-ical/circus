import brush from '@utrad-ical/circus-icons/icons/brush.svg?raw';
import bucket from '@utrad-ical/circus-icons/icons/bucket.svg?raw';
import bucketErase from '@utrad-ical/circus-icons/icons/bucket-erase.svg?raw';
import celestialRotate from '@utrad-ical/circus-icons/icons/celestial-rotate.svg?raw';
import circle from '@utrad-ical/circus-icons/icons/circle.svg?raw';
import cuboid from '@utrad-ical/circus-icons/icons/cuboid.svg?raw';
import ellipsoid from '@utrad-ical/circus-icons/icons/ellipsoid.svg?raw';
import eraser from '@utrad-ical/circus-icons/icons/eraser.svg?raw';
import hand from '@utrad-ical/circus-icons/icons/hand.svg?raw';
import pager from '@utrad-ical/circus-icons/icons/pager.svg?raw';
import point from '@utrad-ical/circus-icons/icons/point.svg?raw';
import polyline from '@utrad-ical/circus-icons/icons/polyline.svg?raw';
import rectangle from '@utrad-ical/circus-icons/icons/rectangle.svg?raw';
import redo from '@utrad-ical/circus-icons/icons/redo.svg?raw';
import referenceMove from '@utrad-ical/circus-icons/icons/reference-move.svg?raw';
import referenceRotate from '@utrad-ical/circus-icons/icons/reference-rotate.svg?raw';
import ruler from '@utrad-ical/circus-icons/icons/ruler.svg?raw';
import undo from '@utrad-ical/circus-icons/icons/undo.svg?raw';
import wand from '@utrad-ical/circus-icons/icons/wand.svg?raw';
import wandEraser from '@utrad-ical/circus-icons/icons/wand-eraser.svg?raw';
import window from '@utrad-ical/circus-icons/icons/window.svg?raw';
import zoom from '@utrad-ical/circus-icons/icons/zoom.svg?raw';
import zoomIn from '@utrad-ical/circus-icons/icons/zoom-in.svg?raw';
import zoomOut from '@utrad-ical/circus-icons/icons/zoom-out.svg?raw';

/** SVG icons of the toolbar buttons, keyed by kebab-case tool names */
const toolbarIcons: { [name: string]: string } = {
  brush: brush,
  bucket: bucket,
  'bucket-erase': bucketErase,
  'celestial-rotate': celestialRotate,
  circle: circle,
  cuboid: cuboid,
  ellipsoid: ellipsoid,
  eraser: eraser,
  hand: hand,
  pager: pager,
  point: point,
  polyline: polyline,
  rectangle: rectangle,
  redo: redo,
  'reference-move': referenceMove,
  'reference-rotate': referenceRotate,
  ruler: ruler,
  undo: undo,
  wand: wand,
  'wand-eraser': wandEraser,
  window: window,
  zoom: zoom,
  'zoom-in': zoomIn,
  'zoom-out': zoomOut
};

export default toolbarIcons;
