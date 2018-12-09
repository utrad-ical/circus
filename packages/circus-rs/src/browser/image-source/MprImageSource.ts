import ImageSource, { ViewStateResizeTransformer } from './ImageSource';
import ViewState from '../ViewState';
import Viewer from '../viewer/Viewer';
import { createOrthogonalMprSection, adjustOnResized } from '../section-util';
import { Vector3D, Vector2D } from '../../common/geometry';
import { DicomVolumeMetadata } from './volume-loader/DicomVolumeLoader';

/**
 * MprImageSource is a common base class for all
 * 3D volume-based image source classes which can render MPR.
 */
export default abstract class MprImageSource extends ImageSource {
  public metadata: DicomVolumeMetadata | undefined;
  protected loadSequence: Promise<void> | undefined;

  public initialState(viewer: Viewer): ViewState {
    if (!this.metadata) throw new Error('Metadata now loaded');
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
    if (!this.metadata) throw new Error('Metadata now loaded');
    const voxelCount = this.metadata.voxelCount;
    const voxelSize = this.metadata.voxelSize;
    return [
      voxelCount[0] * voxelSize[0],
      voxelCount[1] * voxelSize[1],
      voxelCount[2] * voxelSize[2]
    ];
  }

  /**
   * Produce helper of change state on resizing viewer.
   */
  public getResizeTransformer(): ViewStateResizeTransformer {
    return (
      viewState: ViewState,
      beforeSize: Vector2D,
      afterSize: Vector2D
    ): ViewState => {
      if (viewState.type === 'mpr') {
        const { section } = viewState;
        const resizedSection = adjustOnResized(section, beforeSize, afterSize);
        return section !== resizedSection
          ? { ...viewState, section: resizedSection }
          : viewState;
      } else {
        return viewState;
      }
    };
  }
}
