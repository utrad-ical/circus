import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { InternalLabel, LabelType } from '../labelData';
import { EditingData, EditingDataUpdater } from '../revisionData';
import addNewSctionFromPoints from './addNewSctionFromPoints';
import * as ccl from './ccl-options';
import cclProcessor from './ccl-processor';
import * as ed from './ed-options';
import { erosionProcessor, dilatationProcessor } from './ed-processor';
import * as hf from './hf-options';
import hfProcessor from './hf-processor';
import * as ii from './ii-options';
import iiProcessor from './ii-processor';

export const processorTypes = [
  'ccl',
  'filling',
  'erosion',
  'dilation',
  'interpolation',
  'section'
] as const;

export type ProcessorType = typeof processorTypes[number];

export type ProcessorProgress = {
  value: number;
  label: string;
  finished: boolean;
};

interface ProcessorInput {
  editingData: EditingData;
  selectedLabel: InternalLabel;
  updateEditingData: EditingDataUpdater;
  reportProgress: (progress: ProcessorProgress) => void;
  hints: {
    seriesMetadata: (DicomVolumeMetadata | undefined)[];
    viewers: { [index: string]: Viewer };
    labelColors: string[];
  };
}

// This is not async; progress reported via reportProgress callback
export type Processor<T> = (options: T, input: ProcessorInput) => void;

interface ProcessorModalConfiguration<T> {
  title: string;
  optionsEditor: Editor<T>;
  initialOptions: T;
}

interface ProcessorDefinition {
  caption: string;
  labelType: LabelType;
  processor: Processor<any>;
  settingsModal?: ProcessorModalConfiguration<any>;
}

export const processors: {
  [key in ProcessorType]: ProcessorDefinition;
} = {
  ccl: {
    caption: 'CCL',
    labelType: 'voxel',
    settingsModal: {
      title: 'Connected component labeling (CCL)',
      optionsEditor: ccl.OptionsEditor,
      initialOptions: ccl.initialOptions
    },
    processor: cclProcessor
  },
  filling: {
    caption: 'Hole filling',
    labelType: 'voxel',
    settingsModal: {
      title: 'Hole filling',
      optionsEditor: hf.OptionsEditor,
      initialOptions: hf.initialOptions
    },
    processor: hfProcessor
  },
  erosion: {
    caption: 'Erosion',
    labelType: 'voxel',
    settingsModal: {
      title: 'Erosion',
      optionsEditor: ed.OptionsEditor,
      initialOptions: ed.initialOptions
    },
    processor: erosionProcessor
  },
  dilation: {
    caption: 'Dilation',
    labelType: 'voxel',
    settingsModal: {
      title: 'Dilation',
      optionsEditor: ed.OptionsEditor,
      initialOptions: ed.initialOptions
    },
    processor: dilatationProcessor
  },
  interpolation: {
    caption: 'Interslice interpolation',
    labelType: 'voxel',
    settingsModal: {
      title: 'Interslice interpolation',
      optionsEditor: ii.OptionsEditor,
      initialOptions: ii.initialOptions
    },
    processor: iiProcessor
  },
  section: {
    caption: 'Three points to section',
    labelType: 'point',
    processor: addNewSctionFromPoints
  }
};
