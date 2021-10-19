/**
 * Section determines the 2D section of a volume.
 */
export interface Section2D {
  origin: [number, number];
  xAxis: [number, number];
  yLength: number;
  imageNumber: number;
}
// HACK: Support-2d-image-source
