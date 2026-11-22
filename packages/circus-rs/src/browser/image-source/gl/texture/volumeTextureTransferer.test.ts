import assert from 'node:assert/strict';
import { test } from 'node:test';
import RawData from '../../../../common/RawData.ts';
import volumeTextureTransferer from './volumeTextureTransferer.ts';

// Checks the buffer size of texSubImage2D as WebGL does
const createFakeGl = () => {
  let unpackAlignment = 4;
  const uploads: number[] = [];
  const gl = {
    RGB: 1,
    UNSIGNED_BYTE: 2,
    TEXTURE_2D: 3,
    UNPACK_ALIGNMENT: 4,
    pixelStorei: (name: number, value: number) => {
      if (name === gl.UNPACK_ALIGNMENT) unpackAlignment = value;
    },
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    texSubImage2D: (
      _target: number,
      _level: number,
      _x: number,
      _y: number,
      width: number,
      height: number,
      _format: number,
      _type: number,
      buffer: Uint8Array
    ) => {
      const rowBytes = width * 3;
      const stride = Math.ceil(rowBytes / unpackAlignment) * unpackAlignment;
      if (buffer.length < stride * (height - 1) + rowBytes)
        throw new Error('ArrayBufferView not big enough for request');
      uploads.push(width);
    }
  };
  return { gl: gl as unknown as WebGLRenderingContext, uploads };
};

test('transfers slices whose width is not a multiple of 4', () => {
  const { gl, uploads } = createFakeGl();
  const volume = new RawData([350, 3, 2], 'int16');
  const { transfer } = volumeTextureTransferer(gl, [{}], volume);
  transfer(0);
  transfer(1);
  assert.deepEqual(uploads, [350, 350]);
});
