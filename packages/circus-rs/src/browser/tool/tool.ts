'use strict';

let { vec3 } = require('gl-matrix');
import { EventEmitter } from 'events';
import { ViewerEvent }					from '../../browser/viewer/viewer-event';

export abstract class Tool extends EventEmitter {
	
	public mousedownHandler(ev: ViewerEvent) {}
	public mousemoveHandler(ev: ViewerEvent) {}
	public mouseupHandler(ev: ViewerEvent) {}
	public mousewheelHandler(ev: ViewerEvent) {
		
		let state = ev.viewer.getState();
		let nv = vec3.create();
			
		vec3.cross( nv, state.section.xAxis, state.section.yAxis );
		vec3.normalize( nv, nv );
		vec3.scale( nv, nv, ( ev.original.ctrlKey ? 5 : 1 ) * ( ev.original.deltaY > 0 ? -1 : 1 ) );
		
		vec3.add( state.section.origin, state.section.origin, nv );
		ev.viewer.setState( state );
		ev.viewer.render();
		ev.stopPropagation();
	}

	
}
