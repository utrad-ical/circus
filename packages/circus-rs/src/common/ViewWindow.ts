/**
 * ViewWindow determines how each pixel value is assined
 * to grayscale values on screens.
 */
export interface ViewWindow {
  readonly level: number;
  readonly width: number;
}
