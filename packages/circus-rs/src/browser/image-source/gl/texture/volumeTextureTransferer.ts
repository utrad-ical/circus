import RawData from '../../../../common/RawData';
import { detectTextureLayout } from './functions';
import { transferFunctionOrigin } from './transfer-function-constants';

export default function volumeTextureTransferer(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  volume: RawData
) {
  const voxelCount = volume.getDimension();
  const { sliceSize, sliceGridSize, textureSize } = detectTextureLayout(
    voxelCount
  );

  const getOriginOfSlice = (z: number) => [
    (z % sliceGridSize[0]) * sliceSize[0],
    Math.floor(z / sliceGridSize[0]) * sliceSize[1]
  ];

  const width = voxelCount[0]; // < sliceSize[0]
  const height = voxelCount[1]; // < sliceSize[1]

  const formatType = gl.RGB;
  const formatBytes = 3;

  const createSingleImageBuffer = (z: number): Uint8Array => {
    if (voxelCount[2] <= z) throw new RangeError('z-index out of bounds');

    const buffer = new Uint8Array(voxelCount[0] * voxelCount[1] * formatBytes);

    let offset = 0;
    for (let y = 0; y < voxelCount[1]; y++) {
      for (let x = 0; x < voxelCount[0]; x++) {
        const voxelValue = volume.getPixelAt(x, y, z);
        writePixelValue(buffer, offset, voxelValue);
        offset += formatBytes;
      }
    }

    return buffer;
  };

  const writePixelValue = (
    buffer: { [index: number]: number },
    offset: number,
    pixelValue: number
  ) => {
    const texValue = pixelValue - transferFunctionOrigin;

    // upper 8 bits (as dataTexel.r)
    buffer[offset] = (texValue >> 8) & 0xff;

    // under 8 bits (as dataTexel.g)
    buffer[offset + 1] = texValue & 0xff;

    // Set extra bits like mask flag (as dataTexel.b)
    buffer[offset + 2] = 0;
  };

  const transfer = (z: number) => {
    const singleImageBuffer = createSingleImageBuffer(z);
    const [xoffset, yoffset] = getOriginOfSlice(z);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0, // level
      xoffset,
      yoffset,
      width,
      height,
      formatType, // format
      gl.UNSIGNED_BYTE, // type
      singleImageBuffer
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  const [tw, th] = textureSize;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    formatType, // internalformat
    tw, // width
    th, // height
    0, // border
    formatType, // format
    gl.UNSIGNED_BYTE, // type
    null // new Uint8Array(tw * th * formatBytes) // buffer
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // unbind texture
  gl.bindTexture(gl.TEXTURE_2D, null);

  const images = new Array(voxelCount[2] - 1).fill(0).map((v, i) => i);

  return {
    images,
    layout: { sliceSize, sliceGridSize, textureSize },
    transfer
  };
}
