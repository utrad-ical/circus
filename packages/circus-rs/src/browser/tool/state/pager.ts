import { DraggableTool } from '../../../browser/tool/draggable';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { VolumeImageSource } from '../../image-source/volume-image-source';
import { orientationAwareTranslation } from '../../section';

/**
 * PagerTool handles mouse drag and performs the paging of the stacked images.
 */
export class PagerTool extends DraggableTool {
	private currentStep: number;

	public dragHandler(ev: ViewerEvent): void {
		super.dragEndHandler(ev);
		const dragInfo = this.dragInfo;
		const viewer = ev.viewer;
		const state = viewer.getState();

		const step = Math.floor(dragInfo.totalDy / 10);
		const relativeStep = step - this.currentStep;
		if (relativeStep === 0) return;

		const src = viewer.getComposition().imageSource as VolumeImageSource;
		if (!(src instanceof VolumeImageSource)) return;
		const voxelSize = src.voxelSize();

		state.section = orientationAwareTranslation(state.section, voxelSize, relativeStep);
		viewer.setState(state);

		this.currentStep = step;
	}

	public dragStartHandler(ev: ViewerEvent): void {
		super.dragStartHandler(ev);
		this.currentStep = 0;
	}

}
