import { ImageSource } from './image-source';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { createOrthogonalMprSection } from '../section-util';
import { Vector2D, Vector3D } from '../../common/geometry';
import { ViewWindow } from '../../common/ViewWindow';
import { PixelFormat } from '../../common/PixelFormat';

export interface DicomMetadata {
  dicomWindow?: ViewWindow;
  estimatedWindow?: ViewWindow;
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  pixelFormat: PixelFormat;
}

/**
 * VolumeImageSource is a common base class for all
 * 3D volume-based image source classes which can render MPR.
 */
export abstract class VolumeImageSource extends ImageSource {
  public metadata: DicomMetadata;
  protected loadSequence: Promise<void>;

  public initialState(viewer: Viewer): ViewState {
    const metadata = this.metadata;
    const window = metadata.dicomWindow
      ? { ...metadata.dicomWindow }
      : metadata.estimatedWindow
        ? { ...metadata.estimatedWindow }
        : { level: 50, width: 100 };
    // By default, images are drawn with the axial section
    return {
      window,
      interpolationMode: 'trilinear',
      section: createOrthogonalMprSection(viewer.getResolution(), this.mmDim())
    };
  }

  public async ready(): Promise<void> {
    await this.loadSequence;
  }

  /**
   * Calculates the source volume size in millimeters.
   */
  public mmDim(): Vector3D {
    const voxelCount = this.metadata.voxelCount;
    const voxelSize = this.metadata.voxelSize;
    return [
      voxelCount[0] * voxelSize[0],
      voxelCount[1] * voxelSize[1],
      voxelCount[2] * voxelSize[2]
    ];
  }
}
