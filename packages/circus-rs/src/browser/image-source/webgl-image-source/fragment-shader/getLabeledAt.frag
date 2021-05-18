/**
 * @return 0.0|1.0
 */
float getLabeledAt(float x, float y, float z)
{
  if( x < uLabelBoundaryFrom.x || uLabelBoundaryTo.x < x
   || y < uLabelBoundaryFrom.y || uLabelBoundaryTo.y < y
   || z < uLabelBoundaryFrom.z || uLabelBoundaryTo.z < z
  ) {
    return 0.0;
  }

  x -= uLabelBoundaryFrom.x;
  y -= uLabelBoundaryFrom.y;
  z -= uLabelBoundaryFrom.z;

  float sliceColNo = mod(z, uLabelSliceGridSize[0]);
  float sliceRowNo = floor(z / uLabelSliceGridSize[0]);

  float s = x / uLabelTextureSize[0] + sliceColNo / uLabelSliceGridSize[0];
  float t = y / uLabelTextureSize[1] + sliceRowNo / uLabelSliceGridSize[1];

  return texture2D(uLabelSampler, vec2(s,t)).a * 256.0;
}

