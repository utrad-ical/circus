/**
 * Maps pixel value to color according to the transfer function.
 */
vec4 getColorFromPixelValue(float pixelValue)
{
  float s = floor(pixelValue / 256.0);
  float t = mod(pixelValue, 256.0);

  return texture2D(uTransferFunctionSampler, vec2(t / 256.0, s / 256.0));
}
