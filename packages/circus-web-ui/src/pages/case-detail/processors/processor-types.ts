import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import React from 'react';
import { InternalLabel, LabelType } from '../labelData';
import { EditingData, EditingDataUpdater } from '../revisionData';
import addNewSctionFromPoints from './addNewSctionFromPoints';
import createCclProcessor, { CclOptions } from './createCclProcessor';
import createEdProcessor, { ErosionDilationOptions } from './createEdProcessor';
import createHfProcessor, { HoleFillingOptions } from './createHfProcessor';
import createIiProcessor, {
  IntersliceInterpolationOptions
} from './createIiProcessor';
import performLabelCreatingVoxelProcessing from './performLabelCreatingVoxelProcessing';
import SettingDialogCCL from './SettingDialogCCL';
import {
  SettingDialogDilatation,
  SettingDialogErosion
} from './SettingDialogED';
import SettingDialogHF from './SettingDialogHF';
import SettingDialogII from './SettingDialogII';

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

export type NewSctionFromPointsProps = {
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  metadata: (DicomVolumeMetadata | undefined)[];
  viewers: { [index: string]: Viewer };
};

export type UpdateLabelProps = {
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  label: InternalLabel;
  labelColors: string[];
  reportProgress: (progress: ProcessorProgress) => void;
};

export type Processor =
  | {
      processor: (props: UpdateLabelProps) => void;
      update: 'label';
    }
  | {
      processor: (props: NewSctionFromPointsProps) => void;
      update: 'section';
    }
  | {
      processor: null;
      update: '';
    };

type SettingDialogProps<T> = {
  processorProgress: ProcessorProgress;
  onHide: () => void;
  onOkClick: (options: T) => void;
};

export type CustomSettingDialog<T> = React.VFC<SettingDialogProps<T>>;

export type ProcessorModalPropertyType =
  | 'ccl'
  | 'filling'
  | 'erosion'
  | 'dilation'
  | 'interpolation';

const processorModalPropertyKey: ProcessorModalPropertyType[] = [
  'ccl',
  'filling',
  'erosion',
  'dilation',
  'interpolation'
];

type ProcessorProperties = {
  caption: string;
  labelType: LabelType;
  update: 'label' | 'section';
  processor: (options?: any) => (props: any) => void;
  settingDialog?: CustomSettingDialog<any>;
};

const processorProperties: {
  [key in ProcessorDialogKey]: ProcessorProperties;
} = {
  ccl: {
    caption: 'CCL',
    labelType: 'voxel',
    update: 'label',
    processor: (options: CclOptions) =>
      performLabelCreatingVoxelProcessing<LabelingResults3D>(
        createCclProcessor(options)
      ),
    settingDialog: SettingDialogCCL
  },
  filling: {
    caption: 'Hole filling',
    labelType: 'voxel',
    update: 'label',
    processor: (options: HoleFillingOptions) =>
      performLabelCreatingVoxelProcessing<LabelingResults3D>(
        createHfProcessor(options)
      ),
    settingDialog: SettingDialogHF
  },
  erosion: {
    caption: 'Erosion',
    labelType: 'voxel',
    update: 'label',
    processor: (options: ErosionDilationOptions) =>
      performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
        createEdProcessor(options)
      ),
    settingDialog: SettingDialogErosion
  },
  dilation: {
    caption: 'Dilation',
    labelType: 'voxel',
    update: 'label',
    processor: (options: ErosionDilationOptions) => {
      return performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
        createEdProcessor(options)
      );
    },
    settingDialog: SettingDialogDilatation
  },
  interpolation: {
    caption: 'Interslice interpolation',
    labelType: 'voxel',
    update: 'label',
    processor: (options: IntersliceInterpolationOptions) =>
      performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
        createIiProcessor(options)
      ),
    settingDialog: SettingDialogII
  },
  section: {
    caption: 'Three points to section',
    labelType: 'point',
    update: 'section',
    processor: () => addNewSctionFromPoints
  },
  '': {
    caption: '',
    labelType: 'voxel',
    update: 'label',
    processor: () => () => {}
  }
};

export { processorProperties, processorModalPropertyKey };
