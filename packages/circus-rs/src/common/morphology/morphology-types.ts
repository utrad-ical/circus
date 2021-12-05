export interface MorphologicalImageProcessingResults {
  /**
   * array of morphological image processing result
   */
  result: Uint8Array;
  /**
   * Position of result array.
   */
  min: [number, number, number];
  max: [number, number, number];
}
