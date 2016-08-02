'use strict';

import { vec3 } from 'gl-matrix';
import { EventEmitter } from 'events';
import { ViewerEvent } from '../../browser/viewer/viewer-event';
import { detectOrthogonalSection } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { VolumeImageSource } from '../image-source/volume-image-source';

/**
 * A tool determines how a viewer intersects with various UI events.
 * An active tool will change the active view state of each viewer.
 */
export class Tool extends EventEmitter {

	public mouseDownHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public mouseMoveHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public mouseUpHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public mouseWheelHandler(ev: ViewerEvent): void {
		const sign = ev.original.deltaY > 0 ? -1 : 1;
		const step = sign * (ev.original.ctrlKey ? 5 : 1);
		this.slide(ev.viewer, step);
		ev.stopPropagation();
	}

	protected slide(viewer: Viewer, step: number = 1): void {
		const src = viewer.getComposition().imageSource as VolumeImageSource;
		if (!(src instanceof VolumeImageSource)) return;
		const state = viewer.getState();
		const orientation = detectOrthogonalSection(state.section);
		const voxelSize = src.voxelSize();
		switch (orientation) {
			case 'axial':
				state.section.origin[2] += voxelSize[2] * step;
				break;
			case 'sagittal':
				state.section.origin[0] += voxelSize[0] * step;
				break;
			case 'coronal':
				state.section.origin[1] += voxelSize[1] * step;
				break;
			default:
				const nv = vec3.create();
				vec3.cross(nv, state.section.xAxis, state.section.yAxis);
				vec3.normalize(nv, nv);
				vec3.scale(nv, nv, step);
				vec3.add(state.section.origin, state.section.origin, nv);
		}
		viewer.setState(state);
	}

}
