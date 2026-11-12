import focus from '@utrad-ical/circus-icons/icons/focus.svg?raw';
import hand from '@utrad-ical/circus-icons/icons/hand.svg?raw';
import pager from '@utrad-ical/circus-icons/icons/pager.svg?raw';
import zoom from '@utrad-ical/circus-icons/icons/zoom.svg?raw';

const close =
  '<svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2.5"/></svg>';
const record = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>';

/** Icons available to `Button`, keyed by the names used so far */
const buttonIcons: { [name: string]: string } = {
  'rs-pager': pager,
  'rs-zoom': zoom,
  'rs-hand': hand,
  'circus-focus': focus,
  'material-close': close,
  // A Glyphicons name used by existing plug-ins
  record
};

export default buttonIcons;
