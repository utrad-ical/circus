import RawData from '../../../../common/RawData';
import { TextureLayout } from './interface';
import { detectTextureLayout, transferDataToTexture } from './functions';
import { transferFunctionOrigin } from '../constants';

export default function loadVolumeIntoTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  volume: RawData,
  mask?: RawData
) {
  const layout = detectTextureLayout(volume.getDimension());
  const buffer = createVolumeTextureBuffer(
    transferFunctionOrigin,
    layout,
    volume,
    mask
  );
  transferDataToTexture(gl, gl.RGB, gl.UNSIGNED_BYTE, texture, layout, buffer);

  return layout;
}

function createVolumeTextureBuffer(
  transferFunctionOrigin: number,
  layout: TextureLayout,
  volume: RawData,
  mask?: RawData
) {
  const size = volume.getDimension();
  const { sliceSize, sliceGridSize, textureSize } = layout;

  const [tw, th] = textureSize;

  const getOriginOfSlice = (z: number) => [
    (z % sliceGridSize[0]) * sliceSize[0],
    Math.floor(z / sliceGridSize[0]) * sliceSize[1]
  ];

  const typeBytes = 3;
  const buffer = new Uint8Array(tw * th * typeBytes);

  for (let z = 0; z < size[2]; z++) {
    const [gx, gy] = getOriginOfSlice(z);

    for (let y = 0; y < size[1]; y++) {
      const o = (gy + y) * tw + gx;

      for (let x = 0; x < size[0]; x++) {
        const texOffset = (o + x) * typeBytes;

        const voxelValue = volume.getPixelAt(x, y, z);
        const texValue = voxelValue - transferFunctionOrigin;

        // upper 8 bits (as dataTexel.r)
        buffer[texOffset] = (texValue >> 8) & 0xff;

        // under 8 bits (as dataTexel.g)
        buffer[texOffset + 1] = texValue & 0xff;

        // Set mask flag (as dataTexel.b)
        // The voxel is ignored if the flag value is 1 and mask function is enabled.
        buffer[texOffset + 2] = !mask || mask.getPixelAt(x, y, z) ? 0 : 1;
      }
    }
  }
  return buffer;
}
