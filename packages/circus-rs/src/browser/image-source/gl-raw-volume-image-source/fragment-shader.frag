precision mediump float;

uniform vec3 uVoxelSizeInverse;
uniform vec3 uVolumeDimension; // draw volume size (sub volume size), on voxel coords system.
uniform vec3 uVolumeOffset; // draw volume offset (sub volume offset), on voxel coords system.

uniform sampler2D uVolumeTextureSampler;
uniform vec2 uTextureSize;
uniform vec2 uSliceGridSize;
// uniform vec2 uSliceSize;

uniform sampler2D uTransferFunctionSampler;

uniform vec3 uRayDirection;
uniform float uRayStepLength;
uniform float uRayIntensityCoef;
uniform int uMaxSteps;
uniform int uInterpolationMode;
uniform vec4 uBackground;

varying vec4 vColor;
varying vec3 vWorldSpaceCoords;

/**
 * Fetches the pixel value at the specified position.
 * Arguments must be all integer (fract(x) == 0.0, etc)
 */
float getValueAt(float x, float y, float z)
{
  float sliceColNo = mod(z, uSliceGridSize[0]);
  float sliceRowNo = floor(z / uSliceGridSize[0]);

  float s = x / uTextureSize[0] + sliceColNo / uSliceGridSize[0];
  float t = y / uTextureSize[1] + sliceRowNo / uSliceGridSize[1];

  vec4 pixelLuminanceAlphaValue = texture2D(uVolumeTextureSampler, vec2(s,t));
  return (pixelLuminanceAlphaValue.a * 256.0 + pixelLuminanceAlphaValue.r) * 256.0;
}

/**
* Performs trilinear interpolation using 8 voxels around the given position.
* Returns -1 for coordinate outside the (sub)volume.
*/
float getPixelWithInterpolation(vec3 mmCoord)
{
  vec3 voxelCoord = mmCoord * uVoxelSizeInverse;

  // Support sub volume
  float x_start = uVolumeOffset.x;
  float y_start = uVolumeOffset.y;
  float z_start = uVolumeOffset.z;
  float x_end = uVolumeOffset.x + uVolumeDimension.x - 1.0;
  float y_end = uVolumeOffset.y + uVolumeDimension.y - 1.0;
  float z_end = uVolumeOffset.z + uVolumeDimension.z - 1.0;

  float x = voxelCoord.x;
  float y = voxelCoord.y;
  float z = voxelCoord.z;

  if( x < x_start || x_end < x
   || y < y_start || y_end < y
   || z < z_start || z_end < z
  ) return -1.0;

  // Handle edge cases
  float iz = floor(z);
  if (iz >= z_end) {
    iz = z_end - 1.0;
    z = z_end;
  }
  float ix = floor(x);
  if (ix >= x_end) {
    ix = x_end - 1.0;
    x = x_end;
  }
  float iy = floor(y);
  if (iy >= y_end) {
    iy = y_end - 1.0;
    y = y_end;
  }

  // p0 p1
  // p2 p3
  float z1p0 = getValueAt(ix      , iy      , iz);
  float z1p1 = getValueAt(ix + 1.0, iy      , iz);
  float z1p2 = getValueAt(ix      , iy + 1.0, iz);
  float z1p3 = getValueAt(ix + 1.0, iy + 1.0, iz);

  float z1y1 = mix( z1p0, z1p1, fract(x) );
  float z1y2 = mix( z1p2, z1p3, fract(x) );
  float z1 = mix( z1y1, z1y2, fract(y) );

  float z2p0 = getValueAt(ix      , iy      , iz + 1.0);
  float z2p1 = getValueAt(ix + 1.0, iy      , iz + 1.0);
  float z2p2 = getValueAt(ix      , iy + 1.0, iz + 1.0);
  float z2p3 = getValueAt(ix + 1.0, iy + 1.0, iz + 1.0);

  float z2y1 = mix(z2p0, z2p1, fract(x));
  float z2y2 = mix(z2p2, z2p3, fract(x));
  float z2 = mix z2y1, z2y2, fract(y));

  return mix(z1, z2, fract(z));
}

float getPixelWithNearestNeighbor(vec3 mmCoord)
{

  vec3 voxelCoord = mmCoord * uVoxelSizeInverse;

  // Support sub volume
  float x_start = uVolumeOffset.x;
  float y_start = uVolumeOffset.y;
  float z_start = uVolumeOffset.z;
  float x_end = uVolumeOffset.x + uVolumeDimension.x - 1.0;
  float y_end = uVolumeOffset.y + uVolumeDimension.y - 1.0;
  float z_end = uVolumeOffset.z + uVolumeDimension.z - 1.0;

  float x = voxelCoord.x;
  float y = voxelCoord.y;
  float z = voxelCoord.z;

  if( x < x_start || x_end < x
   || y < y_start || y_end < y
   || z < z_start || z_end < z
  ) return -1.0;

  float ix = floor(0.5 + voxelCoord.x);
  float iy = floor(0.5 + voxelCoord.y);
  float iz = floor(0.5 + voxelCoord.z);
  return getValueAt(ix, iy, iz);
}

/**
 * Maps pixel value to color according to the transfer function.
 */
vec4 getColorFromPixelValue(float pixelValue)
{

  float s = floor(pixelValue / 256.0);
  float t = mod(pixelValue, 256.0);

  if(pixelValue < 0.0)
    return vec4(0.0, 0.0, 0.0, 0.0);

  return texture2D(uTransferFunctionSampler, vec2(t / 256.0, s / 256.0));
}

/** *************************************************************************************************
* If using masked value and trilinear filtering, the marking color becomes too weak.
* Parse pixel value as if the first bit is mask.
* ****************************************************************************************************/
vec2 getValueAndMaskAt(float x, float y, float z)
{
  float sliceColNo = mod(z, uSliceGridSize[0]);
  float sliceRowNo = floor(z / uSliceGridSize[0]);

  float s = x / uTextureSize[0] + sliceColNo / uSliceGridSize[0];
  float t = y / uTextureSize[1] + sliceRowNo / uSliceGridSize[1];

  vec4 pixelLuminanceAlphaValue = texture2D uVolumeTextureSampler, vec2(s,t));
  float pixelValue = (pixelLuminanceAlphaValue.a * 256.0 + pixelLuminanceAlphaValue.r) * 256.0;

  if (pixelValue > 32767.0) {
      return vec2(pixelValue - 32767.0, 1.0);
  }else{
      return vec2(pixelValue, 0.0);
  }
}

vec2 getPixelWithInterpolationAndMask(vec3 mmCoord)
{
  vec3 voxelCoord = mmCoord * uVoxelSizeInverse;

  // Support sub volume
  float x_start = uVolumeOffset.x;
  float y_start = uVolumeOffset.y;
  float z_start = uVolumeOffset.z;
  float x_end = uVolumeOffset.x + uVolumeDimension.x - 1.0;
  float y_end = uVolumeOffset.y + uVolumeDimension.y - 1.0;
  float z_end = uVolumeOffset.z + uVolumeDimension.z - 1.0;

  float x = voxelCoord.x;
  float y = voxelCoord.y;
  float z = voxelCoord.z;

  if( x < x_start || x_end < x
   || y < y_start || y_end < y
   || z < z_start || z_end < z
  ) return vec2(-1.0, 0.0);

  // Handle edge cases
  float iz = floor(z);
  if (iz >= z_end) {
    iz = z_end - 1.0;
    z = z_end;
  }
  float ix = floor(x);
  if (ix >= x_end) {
    ix = x_end - 1.0;
    x = x_end;
  }
  float iy = floor(y);
  if (iy >= y_end) {
    iy = y_end - 1.0;
    y = y_end;
  }

  // p0 p1
  // p2 p3
  vec2 src10 = getValueAndMaskAt(ix      , iy      , iz);
  vec2 src11 = getValueAndMaskAt(ix + 1.0, iy      , iz);
  vec2 src12 = getValueAndMaskAt(ix      , iy + 1.0, iz);
  vec2 src13 = getValueAndMaskAt(ix + 1.0, iy + 1.0, iz);
  vec2 src20 = getValueAndMaskAt(ix      , iy      , iz + 1.0);
  vec2 src21 = getValueAndMaskAt(ix + 1.0, iy      , iz + 1.0);
  vec2 src22 = getValueAndMaskAt(ix      , iy + 1.0, iz + 1.0);
  vec2 src23 = getValueAndMaskAt(ix + 1.0, iy + 1.0, iz + 1.0);

  float maskTotal = src10.y
                  + src11.y
                  + src12.y
                  + src13.y
                  + src20.y
                  + src21.y
                  + src22.y
                  + src23.y;

  float z1p0 = src10.x;
  float z1p1 = src11.x;
  float z1p2 = src12.x;
  float z1p3 = src13.x;
  float z2p0 = src20.x;
  float z2p1 = src21.x;
  float z2p2 = src22.x;
  float z2p3 = src23.x;

  float z1y1 = mix(z1p0, z1p1, fract(x));
  float z1y2 = mix(z1p2, z1p3, fract(x));
  float z1 = mix(z1y1, z1y2, fract(y));

  float z2y1 = mix(z2p0, z2p1, fract(x));
  float z2y2 = mix(z2p2, z2p3, fract(x));
  float z2 = mix(z2y1, z2y2, fract(y));

  return vec2(mix(z1, z2, fract(z)), maskTotal);
}

/**
* Get color on the fragment by performing the ray marching iterations
*/
vec4 getColorWithRayCasting(vec3 frontMmCoord)
{
  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 cursor = frontMmCoord;

  vec3 rayDeltaDirection = uRayDirection * uRayStepLength;

  float pixelValue; // negative value indicates outside of the volume boundary

  vec4 accumulatedColor = vec4(0.0);
  float accumulatedAlpha = 0.0;

  vec4 colorSample;
  float alphaSample;

  bool inVolume = false;

  // Front-to-back
  // ceil( sqrt(3) * 512 ) = 887 * 4 // minimum uRayStepLength = 0.25
  const int MAX_STEPS = 3548; // hard max
  for (int i = 0; i < MAX_STEPS; i++) {
    if (uMaxSteps < i) // used as while( i++ < uMaxSteps )
      break;

    bool masked = false;
    if (uInterpolationMode == 1) {
        pixelValue = getPixelWithInterpolation(cursor);
    } else if (uInterpolationMode == 2) {
        vec2 p = getPixelWithInterpolationAndMask(cursor);
        pixelValue = p.x;
        masked = p.y >= 1.0;
    } else {
        pixelValue = getPixelWithNearestNeighbor(cursor);
    }

    if (pixelValue >= 0.0) {
      // The ray entered the volume
      inVolume = true;
    } else if (inVolume && pixelValue < 0.0) {
      // The ray left the volume (after entering it)
      break;
    }

    colorSample = getColorFromPixelValue( pixelValue );

    if(masked) {
      colorSample.r = min(1.0, colorSample.r + 0.10);
      colorSample.g = min(1.0, colorSample.g + 0.30);
    }

    alphaSample = colorSample.a * (1.0 - accumulatedAlpha) * uRayStepLength * uRayIntensityCoef;

    accumulatedAlpha += alphaSample;
    accumulatedColor += colorSample * alphaSample;

    cursor += rayDeltaDirection;

    if (accumulatedAlpha >= 1.0) break;
  }

  if (accumulatedAlpha == 0.0) return uBackground;

  accumulatedColor.a = 1.0;

  return accumulatedColor;
}

void main() {
  int debug = 0;

  // - check rendering volume box
  if (debug == 1) {
    gl_FragColor = vColor;
  }
  // - check texture
  else if (debug == 2) {
    float windowLevel = 200.0;
    float windowWidth = 600.0;
    float zSliceIndex = 66.0;

    float x = floor(gl_FragCoord.x + 0.5);
    float y = floor(gl_FragCoord.y + 0.5);
    float z = float(zSliceIndex);

    float pixelValue = getValueAt(x,y,z);

    float appliedValue = clamp(
      (pixelValue - windowLevel + windowWidth / 2.0) * (1.0 / windowWidth),
      0.0, 1.0
    );

    gl_FragColor = vec4(appliedValue, appliedValue, appliedValue, 1.0);
  }
  // - volume rendering
  else {
    gl_FragColor = getColorWithRayCasting(vWorldSpaceCoords);
  }
}
