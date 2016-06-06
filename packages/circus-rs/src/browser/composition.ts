'use strict';

import { EventEmitter } from 'events';

import { Painter }						from '../browser/interface/painter';
import { Sprite }						from '../browser/viewer/sprite';
import { ImageSource }					from '../browser/image-source/image-source';
import { ViewerEvent }					from '../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../browser/interface/viewer-event-target';

export class Composition extends EventEmitter {
	
	constructor( ) {
		super();
	}
	
}
