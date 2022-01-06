import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import { CclOptions } from './createCclProcessor';
import { ErosionDilationOptions } from './createEdProcessor';
import { HoleFillingOptions } from './createHfProcessor';
import { IntersliceInterpolationOptions } from './createIiProcessor';

export type ProcessorInputMap = {
  ccl: CclOptions;
  filling: HoleFillingOptions;
  erosion: ErosionDilationOptions;
  dilation: ErosionDilationOptions;
  interpolation: IntersliceInterpolationOptions;
  section: void;
  '': void;
};

export type ProcessorResultMap = {
  ccl: LabelingResults3D;
  filling: LabelingResults3D;
  erosion: MorphologicalImageProcessingResults;
  dilation: MorphologicalImageProcessingResults;
  interpolation: MorphologicalImageProcessingResults;
  section: void;
  '': void;
};

export type ProcessorDialogKey = keyof ProcessorInputMap;

export type ProcessorInput<T extends keyof ProcessorInputMap> = {
  type: T;
  data: ProcessorInputMap[T];
};

export type ProcessorResult<T extends keyof ProcessorResultMap> = {
  type: T;
  data: ProcessorResultMap[T];
};

export type SettingDialogProperty = {
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick:
    | ((props: CclOptions) => void)
    | ((props: ErosionDilationOptions) => void)
    | ((props: HoleFillingOptions) => void)
    | ((props: IntersliceInterpolationOptions) => void);
};
