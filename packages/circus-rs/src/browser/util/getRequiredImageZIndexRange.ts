'use strict';

import { DicomVolumeMetadata } from "../image-source/volume-loader/DicomVolumeLoader";
import { Section } from "common/geometry";

export default function getRequiredImageZIndexRange(section: Section, metadata: DicomVolumeMetadata): [number, number] {
  const sectionVertexZValues = [
    section.origin[2],
    section.origin[2] + section.xAxis[2],
    section.origin[2] +
    section.xAxis[2] +
    section.yAxis[2],
    section.origin[2] + section.yAxis[2]
  ];

  const minImage = Math.max(
    0,
    Math.floor(
      Math.min(...sectionVertexZValues) / metadata.voxelSize[2] - 0.5
    )
  );

  const maxImage = Math.min(
    metadata.voxelCount[2] - 1,
    Math.floor(
      Math.max(...sectionVertexZValues) / metadata.voxelSize[2] - 0.5
    ) + 1
  );

  return [minImage, maxImage];
}
