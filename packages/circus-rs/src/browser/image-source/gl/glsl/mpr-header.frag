precision mediump float;

uniform vec3 uVoxelSizeInverse;

// draw volume size (sub volume size), on voxel coords system.
uniform vec3 uVolumeDimension;

// draw volume offset (sub volume offset), on voxel coords system.
uniform vec3 uVolumeOffset;

// information of the texture for voxel values(and masks).
uniform sampler2D uVolumeTextureSampler;
uniform vec2 uTextureSize;
uniform vec2 uSliceGridSize;

uniform sampler2D uTransferFunctionSampler;

uniform int uInterpolationMode;
uniform vec4 uBackground;

varying vec3 vWorldSpaceCoords;

uniform int uDebugFlag;

uniform float uWindowWidth;
uniform float uWindowLevel;

struct boundary {
  vec3 start;
  vec3 end;
};

boundary volumeBoundary = boundary(
  uVolumeOffset,
  uVolumeOffset + uVolumeDimension
);

bool outsideOfVolume(vec3 point)
{
  return point.x < volumeBoundary.start.x || volumeBoundary.end.x < point.x
      || point.y < volumeBoundary.start.y || volumeBoundary.end.y < point.y
      || point.z < volumeBoundary.start.z || volumeBoundary.end.z < point.z;
}
