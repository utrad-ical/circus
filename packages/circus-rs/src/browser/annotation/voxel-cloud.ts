import { Annotation } from './annotation';
import { Viewer } from '../viewer/viewer';
import { ViewState } from '../view-state';
import { Sprite } from '../viewer/sprite';
import RawData from '../../common/RawData';
import { PixelFormat } from '../../common/PixelFormat';


/**
 * VoxelCloud is a type of Annotation that can be registered to a Composition.
 * This represents one voxel cloud annotation (aka voxel label).
 * An instance of VoxelCloud can be updated manually by the consumer of CIRCUS RS,
 * or automatically by various cloud manipulation tools.
 */
export class VoxelCloud implements Annotation {
	/**
	 * ShadowCanvas is a background canvas used to perform
	 * various pixel-based composite operations.
	 * @type {HTMLCanvasElement}
	 */
	private static shadowCanvas: HTMLCanvasElement;

	/**
	 * Displayed color of the cloud, in the form of '#ff00ff'
	 */
	public color: string;

	/**
	 * Alpha value of the cloud, must be between 0.0 and 1.0
	 */
	public alpha: number;

	/**
	 * Actual volume data. The pixelFormat must be set to Binary.
	 */
	public volume: RawData;

	/**
	 * The position of the origin of this volume data in the voxel coordinate of ImageSource.
	 * Should be in voxel coordinate (not in mm)!
	 */
	public origin: [number, number, number];

	/**
	 * Determines whether this VoxelCloud is the target of the
	 * cloud manipulation tools (e.g., BrushTool, EraserTool).
	 */
	public active: boolean;

	/**
	 * Prepares the shadow canvas, which is large enough to contain
	 * the canvas of the given viewer. The shadow canvas can be used to
	 * perform background image processing.
	 */
	private prepareShadowCanvas(viewer: Viewer): HTMLCanvasElement {
		const res = viewer.getResolution();

		if (!(VoxelCloud.shadowCanvas instanceof HTMLCanvasElement)) {
			const canvas = document.createElement('canvas');
			canvas.width = res[0];
			canvas.height = res[1];
			VoxelCloud.shadowCanvas = canvas;
			return canvas;
		}
		const canvas = VoxelCloud.shadowCanvas;

		// Setting the width/height of a canvas makes the canvas cleared
		if (canvas.width < res[0]) canvas.width = res[0];
		if (canvas.height < res[1]) canvas.height = res[1];
		return canvas;
	}

	public draw(viewer: Viewer, viewState: ViewState): Sprite {
		if (!(this.volume instanceof RawData)) return;
		if (this.volume.getPixelFormat() !== PixelFormat.Binary) {
			throw new Error('The assigned volume must use binary data format.');
		}

		const context = viewer.canvas.getContext('2d');

		// 1. Checks if this cloud intersects the current section.

		// 2. Prepare a shadow canvas used to perform pixel-based composition.
		const shadow = this.prepareShadowCanvas(viewer);
		const shadowContext = shadow.getContext('2d');
		shadowContext.globalCompositeOperation = '....';

		// 3. Draw
		// context.drawImage()

		return null;
	}

}
