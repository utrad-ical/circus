'use strict'

import { ViewerEvent } from './viewer-event'

export interface ViewerEventCapture {
  hitTest: ( event:ViewerEvent ) => boolean;
  on: (eventType: string, ...args: any[]) => void;
  emit: (eventType: string, ...args: any[]) => boolean;
}
