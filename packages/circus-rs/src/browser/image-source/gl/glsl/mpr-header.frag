precision mediump float;

uniform vec3 uVoxelSizeInverse;

// draw volume size (sub volume size), on voxel coords system.
uniform vec3 uVolumeDimension;

// draw volume offset (sub volume offset), on voxel coords system.
uniform vec3 uVolumeOffset;

// Define a fixed size array for textures
#define MAX_TEXTURES 8

// information of the texture for voxel values(and masks).
uniform sampler2D uVolumeTextureSamplers[MAX_TEXTURES];
// A separate uniform to control the number of textures actually used
uniform int uMaxSliceCount;
uniform vec2 uTextureSize;
uniform vec2 uSliceGridSize;

uniform sampler2D uTransferFunctionSampler;

uniform int uInterpolationMode;
uniform vec4 uBackground;

varying vec3 vWorldSpaceCoords;

uniform int uDebugFlag;

uniform float uWindowWidth;
uniform float uWindowLevel;

vec3 indicesBoundary = uVolumeDimension - vec3(1.0, 1.0, 1.0);

bool outsideOfVolume(vec3 point)
{
  return point.x < 0.0 || uVolumeDimension.x < point.x
      || point.y < 0.0 || uVolumeDimension.y < point.y
      || point.z < 0.0 || uVolumeDimension.z < point.z;
}
