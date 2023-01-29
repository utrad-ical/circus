'use strict';

import { DicomVolumeMetadata } from '../image-source/volume-loader/DicomVolumeLoader';
import { Section } from 'common/geometry';
import { zMinMaxOfSection } from '../section-util';

export default function imageRangeOfSection(
  section: Section,
  metadata: DicomVolumeMetadata
): [number, number] {
  const [min, max] = zMinMaxOfSection(section);

  const minImage = Math.max(0, Math.floor(min / metadata.voxelSize[2] - 0.5));

  const maxImage = Math.min(
    metadata.voxelCount[2] - 1,
    Math.floor(max / metadata.voxelSize[2] - 0.5) + 1
  );

  return [minImage, maxImage];
}
