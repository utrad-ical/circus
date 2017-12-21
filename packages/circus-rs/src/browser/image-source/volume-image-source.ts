import { ImageSource } from './image-source';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { createOrthogonalMprSection } from '../section-util';
import { Vector2D, Vector3D } from '../../common/geometry';
import { ViewWindow } from '../../common/ViewWindow';

export interface DicomMetadata {
  dicomWindow: ViewWindow;
  estimatedWindow: ViewWindow;
  voxelCount: Vector3D;
  voxelSize: Vector3D;
  pixelFormat: number;
}

/**
 * VolumeImageSource is a common base class for all
 * 3D volume-based image source classes which can render MPR.
 */
export abstract class VolumeImageSource extends ImageSource {
  public meta: DicomMetadata;

  protected abstract scan(
    viewState: ViewState,
    outSize: Vector2D
  ): Promise<Uint8Array>;

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

  /**
   * Fetches the MPR image via scan() and builds a canvas-compatible
   * ImageData.
   * @param viewer
   * @param viewState
   * @returns {Promise<ImageData>}
   */
  public draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    const context = viewer.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');
    const resolution = viewer.getResolution();

    return this.scan(viewState, resolution).then(buffer => {
      if (!buffer || buffer.byteLength !== resolution[0] * resolution[1]) {
        throw TypeError('Scanned data is broken');
      }
      const imageData = context.createImageData(resolution[0], resolution[1]);
      const pixelData = imageData.data;
      for (let srcIdx = 0; srcIdx < resolution[0] * resolution[1]; srcIdx++) {
        const pixel = buffer[srcIdx];
        const dstIdx = srcIdx * 4;
        pixelData[dstIdx] = pixel;
        pixelData[dstIdx + 1] = pixel;
        pixelData[dstIdx + 2] = pixel;
        pixelData[dstIdx + 3] = 0xff;
      }
      return imageData;
    });
  }
}
