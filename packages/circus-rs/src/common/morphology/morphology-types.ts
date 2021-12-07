export type MorphologicalImageProcessingResults = {
  /**
   * array of morphological image processing result
   */
  result: Uint8Array;
  /**
   * Position of result array.
   */
  min: [number, number, number];
  max: [number, number, number];
};

export type Structure = {
  array: Uint8Array;
  width: number;
  height: number;
  nSlices: number;
};

export type BasicMorphologicalOperation = (
  array: Uint8Array,
  width: number,
  height: number,
  nSlices?: number,
  structure?: Structure,
  iteration?: number
) => Uint8Array;
