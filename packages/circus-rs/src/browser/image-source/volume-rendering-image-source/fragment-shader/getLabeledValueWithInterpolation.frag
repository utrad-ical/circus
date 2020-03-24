float getLabeledValueWithInterpolation(vec3 p, vec3 i)
{
  // p0 p1
  // p2 p3
  float z1p0 = getLabeledAt(i.x      , i.y      , i.z);
  float z1p1 = getLabeledAt(i.x + 1.0, i.y      , i.z);
  float z1p2 = getLabeledAt(i.x      , i.y + 1.0, i.z);
  float z1p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z);
  float z2p0 = getLabeledAt(i.x      , i.y      , i.z + 1.0);
  float z2p1 = getLabeledAt(i.x + 1.0, i.y      , i.z + 1.0);
  float z2p2 = getLabeledAt(i.x      , i.y + 1.0, i.z + 1.0);
  float z2p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z + 1.0);

  float z1y1 = mix(z1p0, z1p1, fract(p.x));
  float z1y2 = mix(z1p2, z1p3, fract(p.x));
  float z1 = mix(z1y1, z1y2, fract(p.y));

  float z2y1 = mix(z2p0, z2p1, fract(p.x));
  float z2y2 = mix(z2p2, z2p3, fract(p.x));
  float z2 = mix(z2y1, z2y2, fract(p.y));

  return mix(z1, z2, fract(p.z));
}
