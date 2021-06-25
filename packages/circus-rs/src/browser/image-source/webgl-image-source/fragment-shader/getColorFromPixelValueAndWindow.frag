float applyWindow_0_to_255(float width, float level, float pixel) {
  float value = floor(0.5 + (pixel - level + width * 0.5) * (255.0 / width));
  return clamp(value, 0.0, 255.0) / 255.0;
}

/**
 * Maps pixel value to color according to the transfer function.
 */
vec4 getColorFromPixelValueAndWindow(float pixelValue) {
  float voxelValue = pixelValue - 32768.0; // transferFunctionOrigin

  // for debugging
  // float upper = clamp(floor(voxelValue / 256.0), 0.0, 255.0); // (voxelValue >> 8) & 0xff
  // float under = clamp(mod(voxelValue, 256.0), 0.0, 255.0); // voxelValue & 0xff;
  // return vec4(upper / 255.0, 0.0, under / 255.0, 1.0);

  // with transfer function
  // float s = floor(pixelValue / 256.0);
  // float t = mod(pixelValue, 256.0);
  // vec4 color = texture2D(uTransferFunctionSampler, vec2(t / 256.0, s / 256.0));
  // return color;

  // with window setting
  float windowLevel = 329.0;
  float windowWidth = 658.0;
  float monoValue = applyWindow_0_to_255(windowWidth, windowLevel, voxelValue);
  return vec4(monoValue, monoValue, monoValue, 1.0);
}
