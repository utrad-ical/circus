import { mat4, vec3 } from 'gl-matrix';
import { DraggableTool } from '../draggable';
import { Viewer } from '../../viewer/viewer';
import { ViewerEvent } from '../../viewer/viewer-event';

/**
 * CelestialRotateTool handles mouse drags and wheel moves on the Viewer and
 * rotates the MPR section accordingly.
 */
export class CelestialRotateTool extends DraggableTool {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const dragInfo = this.dragInfo;
		if (Math.abs(dragInfo.dx) && Math.abs(dragInfo.dx) >= Math.abs(dragInfo.dy)) {
			const hdeg = ( dragInfo.dx < 0 ? -1 : 1  ) * ( ev.original.ctrlKey ? 2 : 1 );
			this.horizontalRotate(ev.viewer, hdeg);
		}
	}

	public wheelHandler(ev: ViewerEvent): void {
		const vdeg = ( ev.original.deltaY < 0 ? -1 : 1  ) * ( ev.original.ctrlKey ? 2 : 1 );
		this.verticalRotate(ev.viewer, vdeg);
	}

	public horizontalRotate(viewer: Viewer, deg: number) {
		const state = viewer.getState();
		const radian = Math.PI / 180.0 * deg;
		const end0 = state.section.xAxis.concat();

		// rotate
		const transform = mat4.rotate(mat4.create(), mat4.create(), radian, state.section.yAxis);
		vec3.transformMat4(state.section.xAxis, state.section.xAxis, transform);

		const end1 = state.section.xAxis.concat();

		state.section.origin[0] -= ( end1[0] - end0[0] ) / 2;
		state.section.origin[1] -= ( end1[1] - end0[1] ) / 2;
		state.section.origin[2] -= ( end1[2] - end0[2] ) / 2;

		viewer.setState(state);
	}

	public verticalRotate(viewer: Viewer, deg: number) {
		const state = viewer.getState();
		const radian = Math.PI / 180.0 * deg;
		const end0 = state.section.yAxis.concat();

		// rotate
		const transform = mat4.rotate(mat4.create(), mat4.create(), radian, state.section.xAxis);
		vec3.transformMat4(state.section.yAxis, state.section.yAxis, transform);

		const end1 = state.section.yAxis.concat();

		state.section.origin[0] -= ( end1[0] - end0[0] ) / 2;
		state.section.origin[1] -= ( end1[1] - end0[1] ) / 2;
		state.section.origin[2] -= ( end1[2] - end0[2] ) / 2;

		viewer.setState(state);
	}
}
