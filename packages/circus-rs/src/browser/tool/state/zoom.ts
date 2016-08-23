import { mat4, vec3 } from 'gl-matrix';
import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewState } from '../../view-state';
import { Section, getVolumePos } from '../../section';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { VolumeImageSource } from '../../image-source/volume-image-source';

/**
 * ZoomTool
 */
export class ZoomTool extends DraggableTool {

	/**
	 * Holds the current zoom step relative to the drag start time
	 */
	private currentStep: number;

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const dragInfo = this.dragInfo;
		const step = Math.round(dragInfo.totalDy / 15);
		if (step !== this.currentStep) {
			this.zoomStep(ev.viewer, step - this.currentStep, [ev.viewerX, ev.viewerY]);
			this.currentStep = step;
		}
	}

	public dragStartHandler(ev: ViewerEvent): void {
		super.dragStartHandler(ev);
		this.currentStep = 0;
	}

	public wheelHandler(ev: ViewerEvent): void {
		const speed = ev.original.shiftKey ? 3 : 1;
		const direction = this.sign(ev.original.deltaY);
		this.zoomStep(ev.viewer, speed * direction, [ev.viewerX, ev.viewerY]);
	}

	private zoomStep(viewer: Viewer, step: number, center?: [number, number]) {
		const stepFactor = 1.05;
		const state: ViewState = viewer.getState();
		const vp = viewer.getResolution();

		if (!center) center = [vp[0] / 2, vp[1] / 2];
		const focus = getVolumePos(state.section, vp, center[0], center[1]);

		this.scale(state.section, stepFactor ** step, focus);
		viewer.setState(state);
	}

	private scale(section: Section, scale: number, center: [number, number, number]): void {
		const operation = [
			t => mat4.translate(t, t, vec3.scale(vec3.create(), center, -1)),
			t => mat4.scale(t, t, vec3.fromValues(scale, scale, scale)),
			t => mat4.translate(t, t, center)
		].reverse().reduce((p, t) => t(p), mat4.create());

		const xEndPoint = vec3.add(vec3.create(), section.origin, section.xAxis);
		const yEndPoint = vec3.add(vec3.create(), section.origin, section.yAxis);
		const [o, x, y] = [section.origin, xEndPoint, yEndPoint].map(
			p => vec3.transformMat4(vec3.create(), p, operation)
		);
		const xAxis = vec3.subtract(vec3.create(), x, o);
		const yAxis = vec3.subtract(vec3.create(), y, o);

		vec3.copy(section.origin, o);
		vec3.copy(section.xAxis, xAxis);
		vec3.copy(section.yAxis, yAxis);
	}

	/*
	private calcScaleRate(src: VolumeImageSource, viewState: ViewState): number {
		const sw = vec3.len(viewState.section.xAxis);
		const iw = src.mmDim()[0];
		return iw / sw;
	}

	private resetZoomState(viewer: Viewer) {
		const viewState = viewer.getState();
		if (typeof viewState.zoom !== 'undefined') {

			this.zoomStep(viewer, 0);

			let state = viewer.getState();
			state.section.origin[0] -= state.zoom.x;
			state.section.origin[1] -= state.zoom.y;
			state.section.origin[2] -= state.zoom.z;

			delete state.zoom;
			viewer.setState(state);
		}
	}
	*/
}
