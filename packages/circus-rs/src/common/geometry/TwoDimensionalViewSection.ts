import { Section } from '.';

/**
 * Section determines the 2d section of a volume.
 */
export interface TwoDimensionalViewSection {
  origin: [number, number];
  xAxis: [number, number];
  yLength: number;
  imageNumber: number;
}

/**
 * Pseudo-converts a 2D section to an MPR section.
 * @param section2d 2D section
 * @returns MPR section representation of 2D section
 */
export const convertToDummyMprSection = (
  section2d: TwoDimensionalViewSection
): Section => {
  const { origin, xAxis, yLength, imageNumber } = section2d;
  return {
    origin: [...origin, imageNumber],
    xAxis: [...xAxis, 0],
    yAxis: [0, yLength, 0]
  };
};

/**
 * Pseudo-converts an MPR section to a 2D section.
 * @param section MPR section
 * @returns 2D section representation of MPR section
 */
export const convertToTwoDimensionalViewSection = (
  section: Section
): TwoDimensionalViewSection => {
  return {
    origin: [section.origin[0], section.origin[1]],
    xAxis: [section.xAxis[0], section.xAxis[1]],
    yLength: section.yAxis[1],
    imageNumber: Math.round(section.origin[2])
  };
};
