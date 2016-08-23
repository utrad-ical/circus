import { EventEmitter } from 'events';
import { ViewerEvent } from '../../browser/viewer/viewer-event';
import { VolumeImageSource } from '../image-source/volume-image-source';
import { ViewerEventTarget } from '../interface/viewer-event-target';
import { orientationAwareTranslation } from '../section';

/**
 * A tool determines how a viewer intersects with various UI events.
 * An active tool will change the active view state of each viewer.
 */
export class Tool extends EventEmitter implements ViewerEventTarget {

	public mouseDownHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public mouseMoveHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public mouseUpHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public dragStartHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public dragHandler(ev: ViewerEvent): void {
		// do nothing
	}

	public dragEndHandler(ev: ViewerEvent): void {
		// do nothing
	}

	/**
	 * The default mouse wheel handler, which performs paging.
	 */
	public wheelHandler(ev: ViewerEvent): void {
		ev.original.preventDefault();
		const viewer = ev.viewer;
		const state = viewer.getState();
		const step = -Math.sign(ev.original.deltaY) * (ev.original.ctrlKey ? 5 : 1);
		const src = viewer.getComposition().imageSource as VolumeImageSource;
		if (!(src instanceof VolumeImageSource)) return;
		const voxelSize = src.voxelSize();
		state.section = orientationAwareTranslation(state.section, voxelSize, step);
		viewer.setState(state);
	}
}
