'use strict';

let { vec3 } = require('gl-matrix');
import { EventEmitter } from 'events';
import { ViewerEvent }					from '../../browser/viewer/viewer-event';

export abstract class Tool extends EventEmitter {

	public mousedownHandler(ev: ViewerEvent) {
	}

	public mousemoveHandler(ev: ViewerEvent) {
	}

	public mouseupHandler(ev: ViewerEvent) {
	}

	public mousewheelHandler(ev: ViewerEvent) {

		let step = ( ev.original.ctrlKey ? 5 : 1 ) * ( ev.original.deltaY > 0 ? -1 : 1 );

		this.slide(ev.viewer, step);

		ev.stopPropagation();
	}

	protected slide(viewer, step: number = 1) {

		let state = viewer.getState();
		switch (state.stateName) {
			case 'axial':
				state.section.origin[2] += state.voxelSize[2] * step;
				break;
			case 'sagittal':
				state.section.origin[0] += state.voxelSize[0] * step;
				break;
			case 'coronal':
				state.section.origin[1] += state.voxelSize[1] * step;
				break;
			default:
				let nv = vec3.create();
				vec3.cross(nv, state.section.xAxis, state.section.yAxis);
				vec3.normalize(nv, nv);
				vec3.scale(nv, nv, step);

				vec3.add(state.section.origin, state.section.origin, nv);
		}

		viewer.setState(state);
		viewer.render();
	}

	protected getVolumePos( section, viewport, x: number, y: number): [number, number, number] {
		let [ w, h ] = viewport;
		let [ ox, oy, oz ] = section.origin;
		let [ ux, uy, uz ] = section.xAxis.map(i => i / w);
		let [ vx, vy, vz ] = section.yAxis.map(i => i / h);

		return [
			ox + ux * x + vx * y,
			oy + uy * x + vy * y,
			oz + uz * x + vz * y
		];
	}

}
