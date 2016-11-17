import { DraggableTool } from '../draggable';
import { ViewerEvent } from '../../viewer/viewer-event';
import { ViewState } from '../../view-state';
import { translateSection } from '../../../common/geometry';

/**
 * HandTool is a tool which responds to a mouse drag and moves the
 * VolumeImageSource in parallel with the screen.
 */
export class HandTool extends DraggableTool {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const dragInfo = this.dragInfo;

		// Drag events can be triggered continuously even though there is no mouse move,
		// so we ignore events that does not represent actual mouse moves.
		if (dragInfo.dx === 0 && dragInfo.dy === 0) {
			return;
		}

		const viewer = ev.viewer;
		const state = viewer.getState();
		const vp = viewer.getViewport();
		const newState: ViewState = this.translateBy(state, [dragInfo.dx, dragInfo.dy], vp);
		viewer.setState(newState);
	}

	private translateBy(state: ViewState, p: [number, number], vp: [number, number]): ViewState {
		const section = state.section;
		if (!section) return state;
		const eu = [
			section.xAxis[0] / vp[0],
			section.xAxis[1] / vp[0],
			section.xAxis[2] / vp[0]
		];
		const ev = [
			section.yAxis[0] / vp[1],
			section.yAxis[1] / vp[1],
			section.yAxis[2] / vp[1]
		];

		const [ dx2, dy2 ] = p;
		const [ dx, dy, dz ] = [
			eu[0] * -dx2 + ev[0] * -dy2,
			eu[1] * -dx2 + ev[1] * -dy2,
			eu[2] * -dx2 + ev[2] * -dy2];

		state.section = translateSection(section, [dx, dy, dz]);
		return state;
	}

}
