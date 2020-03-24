/**
* Get color on the fragment by performing the ray marching iterations
*/
vec4 getColorWithRayCasting(vec3 frontMmCoord)
{
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
  for (int i = 0; i < MAX_STEPS; i++) {
    if(outsideOfVolume(voxelCoordCursor)) {
      voxelCoordCursor += uSkipStride;
      continue;
    }
    break;
  }

  for (int i = 0; i < MAX_STEPS; i++) {
    labeledIntensity = 0.0;

    if(
      // The transmittance is full
      accumulatedAlpha >= 1.0
      // Arrives at the end
      || outsideOfVolume(voxelCoordCursor)
    ) {
      break;
    }
    
    // With interporation
    if(uInterpolationMode == 1) {
      vec3 voxelIndex = floor(voxelCoordCursor);
      vec2 valueAndMask = getVoxelValueAndMaskValueWithInterpolation(
        voxelCoordCursor,
        voxelIndex
      );
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
      colorSample.rgb = mix(
        colorSample.rgb,
        uLabelLabelColor.rgb,
        // uLabelLabelColor.a * labeledIntensity
        uLabelLabelColor.a
      );
    }

    // uRayIntensityCoef = 1 / intensity / quality
    alphaSample = (colorSample.a * uRayIntensityCoef) * (1.0 - accumulatedAlpha);

    accumulatedAlpha += alphaSample;
    accumulatedColor += colorSample * alphaSample;

    voxelCoordCursor += uRayStride;
  }

  if (accumulatedAlpha == 0.0) return uBackground;

  accumulatedColor.a = 1.0;

  return accumulatedColor;
}
