void main() {

  // Convert coordinate system, mm to voxel index.
  vec3 voxelCoord = vWorldSpaceCoords * uVoxelSizeInverse;
  if(outsideOfVolume(voxelCoord)) {
    gl_FragColor = uBackground;
    return;
  }

  // Get the pixel value of the coordinate.
  float pixelValue = getPixelValue(voxelCoord);

  // Determine the color of the fragment.
  if(uDebugFlag == 0) {
    // - use window
    gl_FragColor = getColorWithWindow(pixelValue, uWindowWidth, uWindowLevel);
  } else if(uDebugFlag == 1) {
    // - use transfer function
    gl_FragColor = getColorWithTransferFunction(pixelValue, uTransferFunctionSampler);
  } else if(uDebugFlag == 2) {
    // - use debug
    gl_FragColor = getColorOfIdentification(pixelValue);
  } else if(uDebugFlag == 3) {
    // - use vertex color
    gl_FragColor = vColor;
  }
}
