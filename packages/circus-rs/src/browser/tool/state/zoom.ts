import { mat4, vec3 } from 'gl-matrix';
import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewState } from '../../view-state';
import { Section, getVolumePos } from '../../section';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { VolumeImageSource } from '../../image-source/volume-image-source';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class ZoomTool extends DraggableTool implements ViewerEventTarget {

	public dragStartHandler(ev: ViewerEvent): void {
		super.dragStartHandler(ev);
		ev.viewer.primaryEventTarget = this;
	}

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const viewState = ev.viewer.getState();
		ev.viewer.setState(viewState);
	}

	public dragEndHandler(ev: ViewerEvent): void {
		super.dragEndHandler(ev);
		ev.viewer.primaryEventTarget = null;
	}

	public wheelHandler(ev: ViewerEvent) {
		this.zoom(
			ev.viewer,
			ev.original.ctrlKey ?
				( ev.original.deltaY > 0 ? '+3' : '-3' )
				: ( ev.original.deltaY > 0 ? '+1' : '-1' ),
			[ev.viewerX, ev.viewerY]
		);
	}

	/**
	 * pan / zoom ( with translate )
	 */
	private initZoomState(viewer: Viewer): void {
		const viewState = viewer.getState();
		if (typeof viewState.zoom === 'undefined') {
			viewState.zoom = {
				value: 1,
				x: 0,
				y: 0,
				z: 0
			};
			viewer.setState(viewState);
		}
	}

	private zoom(viewer: Viewer, zoomVal: number | string, center?: [number,number]) {

		const zoomRate = 1.05;

		this.initZoomState(viewer);

		const state: ViewState = viewer.getState();

		if (typeof zoomVal === 'string') {
			if (zoomVal.substr(0, 1) === '+') {
				zoomVal = state.zoom.value + Math.round(Number(zoomVal.substr(1)));
			} else if (zoomVal.substr(0, 1) === '-') {
				zoomVal = state.zoom.value - Math.round(Number(zoomVal.substr(1)));
			} else {
				zoomVal = state.zoom.value;
			}
		} else if (typeof zoomVal === 'number') {
			zoomVal = Math.round(zoomVal);
		} else {
			zoomVal = state.zoom.value;
		}

		if (zoomVal != state.zoom.value) {
			const vp = viewer.getResolution();
			if (!center) center = [vp[0] / 2, vp[1] / 2];

			const [x0, y0, z0] = state.section.origin;
			const focus = getVolumePos(state.section, vp, center[0], center[1]);

			this.scale(
				state.section,
				zoomRate ** (zoomVal - state.zoom.value),
				focus
			);

			state.zoom.value = zoomVal;

			const [ x1, y1, z1 ] = state.section.origin;
			state.zoom.x += x1 - x0;
			state.zoom.y += y1 - y0;
			state.zoom.z += z1 - z0;

			viewer.setState(state);
		}
	}

	/**
	 * Calculates tha magnifiction factor.
	 * @return The scale rate (1.0 = pixel by pixel)
	 */
	private calcScaleRate(src: VolumeImageSource, viewState: ViewState): number {
		const sw = vec3.len(viewState.section.xAxis);
		const iw = src.mmDim()[0];
		return iw / sw;
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

	private resetZoomState(viewer: Viewer) {
		const viewState = viewer.getState();
		if (typeof viewState.zoom !== 'undefined') {

			this.zoom(viewer, 0);

			let state = viewer.getState();
			state.section.origin[0] -= state.zoom.x;
			state.section.origin[1] -= state.zoom.y;
			state.section.origin[2] -= state.zoom.z;

			delete state.zoom;
			viewer.setState(state);
		}
	}
}
