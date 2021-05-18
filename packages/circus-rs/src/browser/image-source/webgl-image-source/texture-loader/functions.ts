import { TextureLayout } from './interface';

export function detectTextureLayout(
  size: [number, number, number]
): TextureLayout {
  // Returns ceil(log2(n)).
  const getMinPower2 = (n: number) => {
    let m = 0;
    while (1 << ++m < n);
    return m;
  };

  const sliceSize: [number, number] = [
    1 << getMinPower2(size[0]),
    1 << getMinPower2(size[1])
  ];

  // Calculates the number of tile rows and columns.
  // https://qiita.com/YVT/items/c695ab4b3cf7faa93885
  const zpow = getMinPower2(size[2]);
  const sliceGridSize: [number, number] = [
    1 << (Math.floor(zpow / 2) + (zpow % 2)),
    1 << Math.floor(zpow / 2)
  ];

  // The actual size in texels
  const textureSize: [number, number] = [
    sliceSize[0] * sliceGridSize[0],
    sliceSize[1] * sliceGridSize[1]
  ];

  return { sliceSize, sliceGridSize, textureSize };
}

export function transferDataToTexture(
  gl: WebGLRenderingContext,
  glFormat: number,
  glType: number,
  texture: WebGLTexture,
  layout: TextureLayout,
  buffer: Uint8Array
) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    glFormat, // internalformat
    layout.textureSize[0], // width
    layout.textureSize[1], // height
    0, // border
    glFormat, // format
    glType, // type
    buffer
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // unbind texture
  gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * For debugging
 */
export function dumpTexture(buffer: Uint8Array, layout: TextureLayout) {
  const { textureSize, sliceSize, sliceGridSize } = layout;

  let map: string =
    sliceSize[0].toString() +
    'x' +
    sliceSize[1].toString() +
    ' slice on grid [' +
    sliceGridSize[0].toString() +
    ', ' +
    sliceGridSize[1].toString() +
    ']\n';

  let i: number = 0;
  for (let y = 0; y < textureSize[1]; y++) {
    if (y % sliceSize[1] === 0) {
      map += '+'.repeat(textureSize[0] + sliceGridSize[0]) + '+\n';
    }
    for (let x = 0; x < textureSize[0]; x++) {
      if (x % sliceSize[0] === 0) {
        map += '+';
      }
      map += buffer[i++] ? 'X' : ' ';
    }
    map += '+\n';
  }
  map += '+'.repeat(textureSize[0] + sliceGridSize[0]) + '+\n';
  console.log(map);
}
