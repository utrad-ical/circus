import RawData from './RawData';
import { Vector3D } from './geometry';

/**
 * RawData with voxelSize property that represents the size of one voxel
 * measured in millimeter.
 */
export default class AnisotropicRawData extends RawData {
  /**
   * The size of one voxel, measured in millimeter.
   */
  protected voxelSize: Vector3D | undefined;

  /**
   * Sets the size of one voxel in millimeter.
   * @param voxelSize The size of a voxel in millimeter.
   */
  public setVoxelSize(voxelSize: Vector3D): void {
    const [sx, sy, sz] = voxelSize;
    if (sx <= 0 || sy <= 0 || sz <= 0) {
      throw new RangeError('Invalid voxel size.');
    }
    this.voxelSize = [sx, sy, sz];
  }

  /**
   * Returns the size of one voxel.
   * @return A Vector3D object representing the size of one voxel.
   */
  public getVoxelSize(): Vector3D {
    if (!this.voxelSize) throw new Error('Voxel size not set');
    return [this.voxelSize[0], this.voxelSize[1], this.voxelSize[2]];
  }

  /**
   * Returns the dimension of this volume measured in millimeter.
   */
  public getMmDimension(): Vector3D {
    if (!this.size) throw new Error('Dimension not set');
    if (!this.voxelSize) throw new Error('Voxel size not set');

    return [
      this.size[0] * this.voxelSize[0],
      this.size[1] * this.voxelSize[1],
      this.size[2] * this.voxelSize[2]
    ];
  }
}
