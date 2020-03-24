float getLabeledValueAnyNeighbor(vec3 i)
{
  // p0 p1
  // p2 p3
  float z1p0 = getLabeledAt(i.x      , i.y      , i.z);
  if(z1p0 > 0.0) return 1.0;
  float z1p1 = getLabeledAt(i.x + 1.0, i.y      , i.z);
  if(z1p1 > 0.0) return 1.0;
  float z1p2 = getLabeledAt(i.x      , i.y + 1.0, i.z);
  if(z1p2 > 0.0) return 1.0;
  float z1p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z);
  if(z1p3 > 0.0) return 1.0;
  float z2p0 = getLabeledAt(i.x      , i.y      , i.z + 1.0);
  if(z2p0 > 0.0) return 1.0;
  float z2p1 = getLabeledAt(i.x + 1.0, i.y      , i.z + 1.0);
  if(z2p1 > 0.0) return 1.0;
  float z2p2 = getLabeledAt(i.x      , i.y + 1.0, i.z + 1.0);
  if(z2p2 > 0.0) return 1.0;
  float z2p3 = getLabeledAt(i.x + 1.0, i.y + 1.0, i.z + 1.0);
  if(z2p3 > 0.0) return 1.0;
  return 0.0;
}
