/**
* Get color on the fragment by performing the ray marching iterations
*/
vec4 getColorWithWindow(vec3 frontMmCoord) {

  // mm to voxel coords
  vec3 voxelCoordCursor = frontMmCoord * uVoxelSizeInverse;

  float pixelValue; // negative value indicates outside of the volume boundary

  // With interporation
  if(uInterpolationMode == 1) {
    vec3 voxelIndex = floor(voxelCoordCursor);
    vec2 valueAndMask = getVoxelValueAndMaskValueWithInterpolation(voxelCoordCursor, voxelIndex);
    pixelValue = valueAndMask.x;
  }

  // Without interporation (Using nearest neighbor)
  else {
    vec3 voxelIndex = floor(voxelCoordCursor + vec3(0.5, 0.5, 0.5));
    vec2 valueAndMask = getValueAt(voxelIndex.x, voxelIndex.y, voxelIndex.z);
    pixelValue = valueAndMask.x;
  }

  // colorSample = getColorFromPixelValue(pixelValue);
  return getColorFromPixelValueAndWindow(pixelValue);
}
