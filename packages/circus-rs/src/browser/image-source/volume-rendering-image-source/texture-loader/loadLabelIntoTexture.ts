import { LabelData } from '../../volume-loader/interface';
import { TextureLayout } from './interface';
import {
  detectTextureLayout,
  transferDataToTexture,
  dumpTexture
} from './functions';

export default function loadLabelIntoTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  label: LabelData
) {
  const layout = detectTextureLayout(label.size);
  const buffer = createLabelTextureBuffer(layout, label);
  transferDataToTexture(
    gl,
    gl.ALPHA,
    gl.UNSIGNED_BYTE,
    texture,
    layout,
    buffer
  );

  // @todo remove debugging line.
  // dumpTexture(buffer, layout);

  return layout;
}

function createLabelTextureBuffer(layout: TextureLayout, label: LabelData) {
  const { size, offset } = label;
  const { sliceSize, sliceGridSize, textureSize } = layout;

  const [ox, oy, oz] = offset;
  const [tw, th] = textureSize;

  const getOriginOfSlice = (z: number) => [
    (z % sliceGridSize[0]) * sliceSize[0],
    Math.floor(z / sliceGridSize[0]) * sliceSize[1]
  ];

  const buffer = new Uint8Array(tw * th);
  for (let z = 0; z < size[2]; z++) {
    const [gx, gy] = getOriginOfSlice(z);

    for (let y = 0; y < size[1]; y++) {
      const o = (gy + y) * tw + gx;

      for (let x = 0; x < size[0]; x++) {
        const texOffset = o + x;
        buffer[texOffset] = label.getValueAt(x + ox, y + oy, z + oz) ? 1.0 : 0;
      }
    }
  }
  return buffer;
}
