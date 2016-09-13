import { ImageSource } from './image-source';
import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { createOrthogonalMprSection } from '../section';

/**
 * VolumeImageSource is a common base class for all
 * 3D volume-based image source classes which can render MPR.
 */
export abstract class VolumeImageSource extends ImageSource {
	protected meta: DicomMetadata;

	protected abstract scan(param): Promise<Uint8Array>;

	public initialState(viewer: Viewer): ViewState {
		let window = {
			level: this.meta.estimatedWindow.level,
			width: this.meta.estimatedWindow.width
		};
		if ('dicomWindow' in this.meta) {
			window = {
				level: this.meta.dicomWindow.level,
				width: this.meta.dicomWindow.width
			};
		}
		// By default, images are drawn with the axial section
		return {
			window,
			section: createOrthogonalMprSection(viewer.getResolution(), this.mmDim())
		};
	}

	public voxelSize(): [number, number, number] {
		return this.meta.voxelSize;
	}

	/**
	 * Calculates the source volume size in millimeters.
	 */
	public mmDim(): [number, number, number] {
		const voxelCount = this.meta.voxelCount;
		const voxelSize = this.meta.voxelSize;
		return [
			voxelCount[0] * voxelSize[0],
			voxelCount[1] * voxelSize[1],
			voxelCount[2] * voxelSize[2]
		];
	}

	public draw(viewer: Viewer, viewState: ViewState): Promise<void> {
		const canvas = viewer.canvas;
		const context = canvas.getContext('2d');
		const vpWidth = canvas.width;
		const vpHeight = canvas.height;
		const section = viewState.section;
		const window = viewState.window;
		const voxelSize = this.meta.voxelSize;

		const scanParam = {
			origin: [
				Math.floor(section.origin[0] / voxelSize[0]),
				Math.floor(section.origin[1] / voxelSize[1]),
				Math.floor(section.origin[2] / voxelSize[2])
			],
			u: [
				section.xAxis[0] / voxelSize[0] / vpWidth,
				section.xAxis[1] / voxelSize[1] / vpWidth,
				section.xAxis[2] / voxelSize[2] / vpWidth
			],
			v: [
				section.yAxis[0] / voxelSize[0] / vpHeight,
				section.yAxis[1] / voxelSize[1] / vpHeight,
				section.yAxis[2] / voxelSize[2] / vpHeight
			],
			size: [vpWidth, vpHeight],
			ww: window.width,
			wl: window.level
		};

		return this.scan(scanParam)
			.then(buffer => {
				let imageData = context.createImageData(vpWidth, vpHeight);
				let srcidx = 0, pixel, dstidx;
				for (var y = 0; y < vpHeight; y++) {
					for (var x = 0; x < vpWidth; x++) {
						pixel = buffer[srcidx];
						dstidx = srcidx << 2; // meaning multiply 4
						imageData.data[dstidx] = pixel;
						imageData.data[dstidx + 1] = pixel;
						imageData.data[dstidx + 2] = pixel;
						imageData.data[dstidx + 3] = 0xff;
						srcidx++;
					}
				}
				context.putImageData(imageData, 0, 0);
			});
	}

}
