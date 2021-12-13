/**
 * @return 0.0|1.0
 */
float getLabeledAt(float x, float y, float z) {
  if(x < uLabelBoundaryFrom.x || uLabelBoundaryTo.x < x || y < uLabelBoundaryFrom.y || uLabelBoundaryTo.y < y || z < uLabelBoundaryFrom.z || uLabelBoundaryTo.z < z) {
    return 0.0;
  }

  x -= uLabelBoundaryFrom.x;
  y -= uLabelBoundaryFrom.y;
  z -= uLabelBoundaryFrom.z;

  float sliceColNo = mod(z, uLabelSliceGridSize[0]);
  float sliceRowNo = floor(z / uLabelSliceGridSize[0]);

  float s = x / uLabelTextureSize[0] + sliceColNo / uLabelSliceGridSize[0];
  float t = y / uLabelTextureSize[1] + sliceRowNo / uLabelSliceGridSize[1];

  return texture2D(uLabelSampler, vec2(s, t)).a * 256.0;
}

/**
 * Fetches the pixel value at the specified position.
 * Arguments must be all integer (fract(x) == 0.0, etc)
 */
vec2 getValueAt(float x, float y, float z) {
  float sliceColNo = mod(z, uSliceGridSize[0]);
  float sliceRowNo = floor(z / uSliceGridSize[0]);

  float s = x / uTextureSize[0] + sliceColNo / uSliceGridSize[0];
  float t = y / uTextureSize[1] + sliceRowNo / uSliceGridSize[1];

  vec4 dataTexel = texture2D(uVolumeTextureSampler, vec2(s, t));
  float texelValue = floor(dataTexel.r * 255.0) * 256.0 + floor(dataTexel.g * 255.0);
  dataTexel.b = floor(dataTexel.b * 255.0);

  // Check If the voxel is masked
  return vec2(texelValue, dataTexel.b);
}
/**
 * Maps pixel value to color according to the transfer function.
 */
vec4 getColorFromPixelValue(float pixelValue) {
  float s = floor(pixelValue / 256.0);
  float t = mod(pixelValue, 256.0);

  return texture2D(uTransferFunctionSampler, vec2(t / 256.0, s / 256.0));
}
vec2 getVoxelValueAndMaskValueWithInterpolation(vec3 p, vec3 i) {
  // p0 p1
  // p2 p3
  vec2 z1p0 = getValueAt(i.x, i.y, i.z);
  vec2 z1p1 = getValueAt(i.x + 1.0, i.y, i.z);
  vec2 z1p2 = getValueAt(i.x, i.y + 1.0, i.z);
  vec2 z1p3 = getValueAt(i.x + 1.0, i.y + 1.0, i.z);
  vec2 z2p0 = getValueAt(i.x, i.y, i.z + 1.0);
  vec2 z2p1 = getValueAt(i.x + 1.0, i.y, i.z + 1.0);
  vec2 z2p2 = getValueAt(i.x, i.y + 1.0, i.z + 1.0);
  vec2 z2p3 = getValueAt(i.x + 1.0, i.y + 1.0, i.z + 1.0);

  vec2 z1y1 = mix(z1p0, z1p1, fract(p.x));
  vec2 z1y2 = mix(z1p2, z1p3, fract(p.x));
  vec2 z1 = mix(z1y1, z1y2, fract(p.y));

  vec2 z2y1 = mix(z2p0, z2p1, fract(p.x));
  vec2 z2y2 = mix(z2p2, z2p3, fract(p.x));
  vec2 z2 = mix(z2y1, z2y2, fract(p.y));

  return mix(z1, z2, fract(p.z));
}

// // If highlighting label with interporation, it seems too weak.
// float getLabeledValueWithInterpolation(vec3 p, vec3 i) {
//   // p0 p1
//   // p2 p3
//   float z1p0 = getLabeledAt(i.x, i.y, i.z);
//   float z1p1 = getLabeledAt(i.x + 1.0, i.y, i.z);
//   float z1p2 = getLabeledAt(i.x, i.y + 1.0, i.z);
//   float z1p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z);
//   float z2p0 = getLabeledAt(i.x, i.y, i.z + 1.0);
//   float z2p1 = getLabeledAt(i.x + 1.0, i.y, i.z + 1.0);
//   float z2p2 = getLabeledAt(i.x, i.y + 1.0, i.z + 1.0);
//   float z2p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z + 1.0);

//   float z1y1 = mix(z1p0, z1p1, fract(p.x));
//   float z1y2 = mix(z1p2, z1p3, fract(p.x));
//   float z1 = mix(z1y1, z1y2, fract(p.y));

//   float z2y1 = mix(z2p0, z2p1, fract(p.x));
//   float z2y2 = mix(z2p2, z2p3, fract(p.x));
//   float z2 = mix(z2y1, z2y2, fract(p.y));

//   return mix(z1, z2, fract(p.z));
// }

float getLabeledValueAnyNeighbor(vec3 i) {
  // p0 p1
  // p2 p3
  float z1p0 = getLabeledAt(i.x, i.y, i.z);
  if(z1p0 > 0.0)
    return 1.0;
  float z1p1 = getLabeledAt(i.x + 1.0, i.y, i.z);
  if(z1p1 > 0.0)
    return 1.0;
  float z1p2 = getLabeledAt(i.x, i.y + 1.0, i.z);
  if(z1p2 > 0.0)
    return 1.0;
  float z1p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z);
  if(z1p3 > 0.0)
    return 1.0;
  float z2p0 = getLabeledAt(i.x, i.y, i.z + 1.0);
  if(z2p0 > 0.0)
    return 1.0;
  float z2p1 = getLabeledAt(i.x + 1.0, i.y, i.z + 1.0);
  if(z2p1 > 0.0)
    return 1.0;
  float z2p2 = getLabeledAt(i.x, i.y + 1.0, i.z + 1.0);
  if(z2p2 > 0.0)
    return 1.0;
  float z2p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z + 1.0);
  if(z2p3 > 0.0)
    return 1.0;
  return 0.0;
}
/**
* Get color on the fragment by performing the ray marching iterations
*/
vec4 getColorWithRayCasting(vec3 frontMmCoord) {
  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

  // mm to voxel coords
  vec3 voxelCoordCursor = frontMmCoord * uVoxelSizeInverse;

  float pixelValue; // negative value indicates outside of the volume boundary

  vec4 accumulatedColor = vec4(0.0);
  float accumulatedAlpha = 0.0;

  vec4 colorSample;
  float alphaSample;

  float labeledIntensity = 0.0;

  const int MAX_STEPS = 3548; // hard max

  // Front-to-back
  // ceil( sqrt(3) * 512 ) = 887 * 4 // minimum uRayStepLength = 0.25

  // Proceed until into volume.
  // Rendering object(ex. specified by viewState.subVolume) is assumed
  // to be contained in the volume.
  for(int i = 0; i < MAX_STEPS; i++) {
    if(outsideOfVolume(voxelCoordCursor)) {
      voxelCoordCursor += uSkipStride;
      continue;
    }
    break;
  }

  for(int i = 0; i < MAX_STEPS; i++) {
    labeledIntensity = 0.0;

    if(
      // The transmittance is full
    accumulatedAlpha >= 1.0
      // Arrives at the end
    || outsideOfVolume(voxelCoordCursor)) {
      break;
    }

    // With interporation
    if(uInterpolationMode == 1) {
      vec3 voxelIndex = floor(voxelCoordCursor);
      vec2 valueAndMask = getVoxelValueAndMaskValueWithInterpolation(voxelCoordCursor, voxelIndex);
      if(uEnableMask == 1 && valueAndMask.y > 0.0) {
        voxelCoordCursor += uRayStride;
        continue;
      } else {
        pixelValue = valueAndMask.x;
      }

      // Highlight label
      if(uEnableLabel > 0) {
        // labeledIntensity = getLabeledValueWithInterpolation(
        //   voxelCoordCursor,
        //   voxelIndex
        // );
        labeledIntensity = getLabeledValueAnyNeighbor(voxelIndex);
      }
    }

    // Without interporation (Using nearest neighbor)
    else {
      vec3 voxelIndex = floor(voxelCoordCursor + vec3(0.5, 0.5, 0.5));
      vec2 valueAndMask = getValueAt(voxelIndex.x, voxelIndex.y, voxelIndex.z);
      if(uEnableMask == 1 && valueAndMask.y > 0.0) {
        voxelCoordCursor += uRayStride;
        continue;
      } else {
        pixelValue = valueAndMask.x;
      }

      // Highlight label
      if(uEnableLabel > 0) {
        // labeledIntensity = getLabeledAt(voxelIndex.x, voxelIndex.y, voxelIndex.z);
        labeledIntensity = getLabeledValueAnyNeighbor(floor(voxelCoordCursor));
      }
    }

    colorSample = getColorFromPixelValue(pixelValue);

    if(labeledIntensity > 0.0) {
      colorSample.rgb = mix(colorSample.rgb, uLabelLabelColor.rgb,
        // uLabelLabelColor.a * labeledIntensity
      uLabelLabelColor.a);
    }

    // uRayIntensityCoef = 1 / intensity / quality
    alphaSample = (colorSample.a * uRayIntensityCoef) * (1.0 - accumulatedAlpha);

    accumulatedAlpha += alphaSample;
    accumulatedColor += colorSample * alphaSample;

    voxelCoordCursor += uRayStride;
  }

  if(accumulatedAlpha == 0.0)
    return uBackground;

  accumulatedColor.a = 1.0;

  return accumulatedColor;
}
