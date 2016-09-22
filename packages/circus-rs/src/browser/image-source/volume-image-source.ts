import { ImageSource } from './image-source';
import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { ViewState, ViewWindow } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { createOrthogonalMprSection, convertSectionToIndex } from '../section-util';
import { Vector2D, Vector3D, Section } from '../../common/geometry';

/**
 * VolumeImageSource is a common base class for all
 * 3D volume-based image source classes which can render MPR.
 */
export abstract class VolumeImageSource extends ImageSource {
	public meta: DicomMetadata;

	protected abstract scan(viewState: ViewState, outSize: Vector2D): Promise<Uint8Array>;

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

	public voxelSize(): Vector3D {
		return this.meta.voxelSize;
	}

	/**
	 * Calculates the source volume size in millimeters.
	 */
	public mmDim(): Vector3D {
		const voxelCount = this.meta.voxelCount;
		const voxelSize = this.meta.voxelSize;
		return [
			voxelCount[0] * voxelSize[0],
			voxelCount[1] * voxelSize[1],
			voxelCount[2] * voxelSize[2]
		];
	}

	public draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
		const context = viewer.canvas.getContext('2d');
		const resolution = viewer.getResolution();

		return this.scan(viewState, resolution)
		.then(buffer => {
			const imageData = context.createImageData(resolution[0], resolution[1]);
			const pixelData = imageData.data;
			let srcIdx = 0, pixel, dstIdx;
			for (let y = 0; y < resolution[1]; y++) {
				for (let x = 0; x < resolution[0]; x++) {
					pixel = buffer[srcIdx];
					dstIdx = srcIdx << 2; // meaning multiply 4
					pixelData[dstIdx] = pixel;
					pixelData[dstIdx + 1] = pixel;
					pixelData[dstIdx + 2] = pixel;
					pixelData[dstIdx + 3] = 0xff;
					srcIdx++;
				}
			}
			return imageData;
		});
	}

}
