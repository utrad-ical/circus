import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import React from 'react';
import { InternalLabel, LabelType } from '../labelData';
import { EditingData, EditingDataUpdater } from '../revisionData';
import addNewSctionFromPoints from './addNewSctionFromPoints';
import * as ccl from './ccl-options';
import createCclProcessor, { CclOptions } from './ccl-processor';
import * as ed from './ed-options';
import createEdProcessor, { ErosionDilationOptions } from './ed-processor';
import * as hf from './hf-options';
import createHfProcessor, { HoleFillingOptions } from './hf-processor';
import * as ii from './ii-options';
import createIiProcessor, {
  IntersliceInterpolationOptions
} from './ii-processor';
import performLabelCreatingVoxelProcessing from './performLabelCreatingVoxelProcessing';

export const processorTypes = [
  'ccl',
  'filling',
  'erosion',
  'dilation',
  'interpolation',
  'section'
] as const;

export type ProcessorType = typeof processorTypes[number];

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

interface ProcessorModalConfiguration<T> {
  title: string;
  optionsEditor: Editor<T>;
  initialOptions: T;
}

interface ProcessorProperties {
  caption: string;
  labelType: LabelType;
  processTarget: 'label' | 'section';
  processorCreator: (options?: any) => (props: any) => void; // ??
  settingsModal?: ProcessorModalConfiguration<any>;
}

export const processors: {
  [key in ProcessorType]: ProcessorProperties;
} = {
  ccl: {
    caption: 'CCL',
    labelType: 'voxel',
    processTarget: 'label',
    settingsModal: {
      title: 'Connected component labeling (CCL)',
      optionsEditor: ccl.OptionsEditor,
      initialOptions: ccl.initialOptions
    },
    processorCreator: (options: CclOptions) =>
      performLabelCreatingVoxelProcessing<LabelingResults3D>(
        createCclProcessor(options)
      )
  },
  filling: {
    caption: 'Hole filling',
    labelType: 'voxel',
    processTarget: 'label',
    settingsModal: {
      title: 'Hole filling',
      optionsEditor: hf.OptionsEditor,
      initialOptions: hf.initialOptions
    },
    processorCreator: (options: HoleFillingOptions) =>
      performLabelCreatingVoxelProcessing<LabelingResults3D>(
        createHfProcessor(options)
      )
  },
  erosion: {
    caption: 'Erosion',
    labelType: 'voxel',
    processTarget: 'label',
    settingsModal: {
      title: 'Erosion',
      optionsEditor: ed.OptionsEditor,
      initialOptions: ed.initialOptionsForErosion
    },
    processorCreator: (options: ErosionDilationOptions) =>
      performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
        createEdProcessor(options)
      )
  },
  dilation: {
    caption: 'Dilation',
    labelType: 'voxel',
    processTarget: 'label',
    settingsModal: {
      title: 'Erosion',
      optionsEditor: ed.OptionsEditor,
      initialOptions: ed.initialOptionsForDilation
    },
    processorCreator: (options: ErosionDilationOptions) =>
      performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
        createEdProcessor(options)
      )
  },
  interpolation: {
    caption: 'Interslice interpolation',
    labelType: 'voxel',
    processTarget: 'label',
    settingsModal: {
      title: 'Erosion',
      optionsEditor: ii.OptionsEditor,
      initialOptions: ii.initialOptions
    },
    processorCreator: (options: IntersliceInterpolationOptions) =>
      performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
        createIiProcessor(options)
      )
  },
  section: {
    caption: 'Three points to section',
    labelType: 'point',
    processTarget: 'section',
    processorCreator: () => addNewSctionFromPoints
  }
};
