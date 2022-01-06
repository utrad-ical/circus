import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import { CclOptions } from './createCclProcessor';
import { ErosionDilationOptions } from './createEdProcessor';
import { HoleFillingOptions } from './createHfProcessor';
import { IntersliceInterpolationOptions } from './createIiProcessor';
import React from 'react';

export type ProcessorOptionsMap = {
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

export type ProcessorDialogKey = keyof ProcessorOptionsMap;

export type ProcessorOptions<T extends keyof ProcessorOptionsMap> = {
  type: T;
  data: ProcessorOptionsMap[T];
};

export type ProcessorResult<T extends keyof ProcessorResultMap> = {
  type: T;
  data: ProcessorResultMap[T];
};

export type ProcessorProgress = { value: number; label: string };

type SettingDialogProps<T> = {
  processorProgress: ProcessorProgress;
  onHide: () => void;
  onOkClick: (options: T) => void;
};

export type CustomSettingDialog<T> = React.VFC<SettingDialogProps<T>>;
