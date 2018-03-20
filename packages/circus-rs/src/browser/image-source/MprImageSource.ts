import ImageSource from './ImageSource';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { createOrthogonalMprSection } from '../section-util';
import { Vector2D, Vector3D } from '../../common/geometry';
import { ViewWindow } from '../../common/ViewWindow';
import { PixelFormat } from '../../common/PixelFormat';
import { DicomVolumeMetadata } from './volume-loader/DicomVolumeLoader';

/**
 * MprImageSource is a common base class for all
 * 3D volume-based image source classes which can render MPR.
 */
export default abstract class MprImageSource extends ImageSource {
  public metadata: DicomVolumeMetadata;
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
      type: 'mpr',
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
