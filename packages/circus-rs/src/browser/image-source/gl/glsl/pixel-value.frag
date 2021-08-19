/**
 * Extract the pixel value from the texel RGBA.
 */
float extractPixelValueFromTexel(vec4 texel) {
  return floor(texel.r * 255.0) * 256.0 + floor(texel.g * 255.0) - 32768.0; // transferFunctionOrigin
}

/**
 * Extract the mask value from the texel RGBA.
 */
float extractMaskValueFromTexel(vec4 texel) {
  return floor(texel.b * 255.0);
}

/**
 * Fetches the texel RGBA at the specified position.
 * Arguments must be all integer (fract(x) == 0.0, etc)
 */
vec4 getTexelOf(float x, float y, float z) {
  float sliceColNo = mod(z, uSliceGridSize[0]);
  float sliceRowNo = floor(z / uSliceGridSize[0]);

  float s = x / uTextureSize[0] + sliceColNo / uSliceGridSize[0];
  float t = y / uTextureSize[1] + sliceRowNo / uSliceGridSize[1];

  return texture2D(uVolumeTextureSampler, vec2(s, t));
}

float getVoxelValueAt(float x, float y, float z) {
  vec4 texel = getTexelOf(x, y, z);
  return extractPixelValueFromTexel(texel);
}

float getInterpolatedVoxelValueAt(vec3 p) {

  vec3 indexPosition = p - vec3(0.5, 0.5, 0.5);

  vec3 i = floor(indexPosition);
  vec3 f = fract(indexPosition);
  vec3 d = vec3(1.0, 1.0, 1.0);

  if(i.x < 0.0) {
    i.x = 0.0;
    d.x = 0.0;
  } else if (indicesBoundary.x <= i.x) {
    d.x = 0.0;
  }

  if(i.y < 0.0) {
    i.y = 0.0;
    d.y = 0.0;
  } else if (indicesBoundary.y <= i.y) {
    d.y = 0.0;
  }

  if(i.z < 0.0) {
    i.z = 0.0;
    d.z = 0.0;
  } else if (indicesBoundary.z <= i.z) {
    d.z = 0.0;
  }

  // p0 p1
  // p2 p3
  float z1p0 = getVoxelValueAt(i.x, i.y, i.z);
  float z1p1 = getVoxelValueAt(i.x + d.x, i.y, i.z);
  float z1p2 = getVoxelValueAt(i.x, i.y + d.y, i.z);
  float z1p3 = getVoxelValueAt(i.x + d.x, i.y + d.y, i.z);

  float z1y1 = mix(z1p0, z1p1, f.x);
  float z1y2 = mix(z1p2, z1p3, f.x);
  float z1 = mix(z1y1, z1y2, f.y);

  float z2p0 = getVoxelValueAt(i.x, i.y, i.z + d.z);
  float z2p1 = getVoxelValueAt(i.x + d.x, i.y, i.z + d.z);
  float z2p2 = getVoxelValueAt(i.x, i.y + d.y, i.z + d.z);
  float z2p3 = getVoxelValueAt(i.x + d.x, i.y + d.y, i.z + d.z);

  float z2y1 = mix(z2p0, z2p1, f.x);
  float z2y2 = mix(z2p2, z2p3, f.x);
  float z2 = mix(z2y1, z2y2, f.y);

  return mix(z1, z2, f.z);
}

/**
* Get the pixel value and the mask value at the specified coordinates in mm
*/
float getPixelValue(vec3 voxelCoord) {

  // With interporation
  if(uInterpolationMode == 1) {
    return getInterpolatedVoxelValueAt(voxelCoord);
  }

  // Without interporation (Using nearest neighbor)
  else {
    vec3 voxelIndex = floor(voxelCoord);
    return getVoxelValueAt(voxelIndex.x, voxelIndex.y, voxelIndex.z);
  }
}

