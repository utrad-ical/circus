'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool }							from '../../../browser/tool/tool';
import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';
import { CrossSection }					from '../../../browser/interface/cross-section';
import { CrossSectionUtil }				from '../../../browser/util/cross-section-util';

export class WheelTool extends Tool implements ViewerEventTarget {
	
	public mousewheelHandler(ev: ViewerEvent) {
	
		
		
		let viewState = ev.viewer.viewState;
		let nv = vec3.create();
			
		vec3.cross( nv, viewState.section.xAxis, viewState.section.yAxis );
		vec3.normalize( nv, nv );
		if( ev.original.deltaY > 0 ) vec3.scale( nv, nv, -1 );
		
		vec3.add( viewState.section.origin, viewState.section.origin, nv );
		ev.viewer.render();
		ev.stopPropagation();
	}
}
