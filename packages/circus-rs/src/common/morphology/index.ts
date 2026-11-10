export type {
  MorphologicalImageProcessingResults,
  Structure,
  BasicMorphologicalOperation
} from './morphology-types.ts';
export { default as dilation } from './dilation.ts';
export { default as erosion } from './erosion.ts';
export { default as distanceTransform } from './distanceTransform.ts';
export { default as intersliceInterpolation } from './intersliceInterpolation.ts';
