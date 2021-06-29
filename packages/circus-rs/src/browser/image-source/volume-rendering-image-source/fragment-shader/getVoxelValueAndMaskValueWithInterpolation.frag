vec2 getVoxelValueAndMaskValueWithInterpolation(vec3 p, vec3 i)
{
  // p0 p1
  // p2 p3
  vec2 z1p0 = getValueAt(i.x      , i.y      , i.z);
  vec2 z1p1 = getValueAt(i.x + 1.0, i.y      , i.z);
  vec2 z1p2 = getValueAt(i.x      , i.y + 1.0, i.z);
  vec2 z1p3 = getValueAt(i.x + 1.0, i.y + 1.0, i.z);
  vec2 z2p0 = getValueAt(i.x      , i.y      , i.z + 1.0);
  vec2 z2p1 = getValueAt(i.x + 1.0, i.y      , i.z + 1.0);
  vec2 z2p2 = getValueAt(i.x      , i.y + 1.0, i.z + 1.0);
  vec2 z2p3 = getValueAt(i.x + 1.0, i.y + 1.0, i.z + 1.0);

  vec2 z1y1 = mix(z1p0, z1p1, fract(p.x));
  vec2 z1y2 = mix(z1p2, z1p3, fract(p.x));
  vec2 z1 = mix(z1y1, z1y2, fract(p.y));

  vec2 z2y1 = mix(z2p0, z2p1, fract(p.x));
  vec2 z2y2 = mix(z2p2, z2p3, fract(p.x));
  vec2 z2 = mix(z2y1, z2y2, fract(p.y));

  return mix(z1, z2, fract(p.z));
}
