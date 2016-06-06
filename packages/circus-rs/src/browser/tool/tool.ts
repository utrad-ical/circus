'use strict';

import { EventEmitter } from 'events';
import { ViewerEvent }					from '../../browser/viewer/viewer-event';

export abstract class Tool extends EventEmitter {
	
	public active: boolean = false; // meaning capture viewer events
	
	public activate(){
		this.active = true;
		this.emit( 'activate' );
	}
	
	public disactivate(){
		this.active = false;
		this.emit( 'disactivate' );
	}
	
	public mousedownHandler(ev: ViewerEvent) {}
	public mousemoveHandler(ev: ViewerEvent) {}
	public mouseupHandler(ev: ViewerEvent) {}
	public mousewheelHandler(ev: ViewerEvent) {}

	
}
