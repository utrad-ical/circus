/**
 * Maps pixel value to color according to the transfer function.
 */
vec4 getColorWithTransferFunction(float pixelValue, sampler2D transferFunctionSampler) {
  float s = floor((pixelValue + 32768.0) / 256.0);
  float t = mod((pixelValue + 32768.0), 256.0);
  vec4 color = texture2D(transferFunctionSampler, vec2(t / 256.0, s / 256.0));
  return color;
}

/**
 * Apply the window width and window level to calculate the color.
 */
vec4 getColorWithWindow(float pixelValue, float windowWidth, float windowLevel) {
  float colorIntensity = floor(0.5 + (pixelValue - windowLevel + windowWidth * 0.5) * (255.0 / windowWidth));
  colorIntensity = clamp(colorIntensity, 0.0, 255.0) / 255.0;

  return vec4(colorIntensity, colorIntensity, colorIntensity, 1.0);
}

/**
 * Get a unique color to identify the pixel value.
 */
vec4 getColorOfIdentification(float pixelValue) {
  float upper = clamp(floor(pixelValue / 256.0), 0.0, 255.0); // (pixelValue >> 8) & 0xff
  float under = clamp(mod(pixelValue, 256.0), 0.0, 255.0); // pixelValue & 0xff;
  return vec4(upper / 255.0, 0.0, under / 255.0, 1.0);
}
