/**
 * Applies window level/width.
 * @param width The window width.
 * @param level The window level.
 * @param pixel The input pixel value, typically a Uint16 value.
 * @return The windowed pixel value between 0 and 255.
 */
export const applyWindow = (
  width: number,
  level: number,
  pixel: number
): number => {
  // NOTE: In the case of color image (rgba8), returns incorrect value.
  let value = Math.round((pixel - level + width / 2) * (255 / width));
  if (value > 255) {
    value = 255;
  } else if (value < 0) {
    value = 0;
  }
  return value;
};
