import { TransferFunction } from '../../../ViewState';
import buildTransferFunctionMap from './buildTransferFunctionMap';
import {
  transferFunctionRange,
  transferFunctionTextureSize
} from '../constants';

export default function loadTransferFunctionIntoTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  transferFunction: TransferFunction
) {
  const buffer = buildTransferFunctionMap(
    transferFunction,
    transferFunctionRange
  );
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    transferFunctionTextureSize[0],
    transferFunctionTextureSize[1],
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    buffer
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // unbind texture
  gl.bindTexture(gl.TEXTURE_2D, null);
}
