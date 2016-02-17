'use strict';

import { EventEmitter } from 'events';

import { ViewerEvent } from './viewer-event'
import { ViewerEventCapture } from './viewer-event-capture-interface'

export abstract class Tool extends EventEmitter implements ViewerEventCapture {
  public abstract hitTest( event:ViewerEvent );
}
