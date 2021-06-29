precision mediump float;

uniform vec3 uVoxelSizeInverse;

// draw volume size (sub volume size), on voxel coords system.
uniform vec3 uVolumeDimension;

// draw volume offset (sub volume offset), on voxel coords system.
uniform vec3 uVolumeOffset;

uniform sampler2D uVolumeTextureSampler;
uniform vec2 uTextureSize;
uniform vec2 uSliceGridSize;

uniform sampler2D uTransferFunctionSampler;

uniform vec3 uSkipStride;
uniform vec3 uRayStride;
uniform float uRayIntensityCoef;
uniform int uInterpolationMode;
uniform vec4 uBackground;

varying vec4 vColor;
varying vec3 vWorldSpaceCoords;

uniform int uDebugFlag;

uniform int uEnableMask;
uniform int uEnableLabel;

uniform sampler2D uLabelSampler;
uniform vec2 uLabelTextureSize;
uniform vec2 uLabelSliceGridSize;
uniform vec3 uLabelBoundaryFrom;
uniform vec3 uLabelBoundaryTo;
uniform vec4 uLabelLabelColor;

struct boundary {
  vec3 start;
  vec3 end;
};

boundary volumeBoundary = boundary(
  uVolumeOffset,
  uVolumeOffset + uVolumeDimension - vec3(1.0, 1.0, 1.0)
);

bool outsideOfVolume(vec3 point)
{
  return point.x < volumeBoundary.start.x || volumeBoundary.end.x < point.x
      || point.y < volumeBoundary.start.y || volumeBoundary.end.y < point.y
      || point.z < volumeBoundary.start.z || volumeBoundary.end.z < point.z;
}
