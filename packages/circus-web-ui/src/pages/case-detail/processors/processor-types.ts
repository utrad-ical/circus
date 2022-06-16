import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { InternalLabel, LabelType } from '../labelData';
import { EditingData, EditingDataUpdater } from '../revisionData';
import addNewSctionFromPoints from './addNewSctionFromPoints';
import * as bo from './bo-options';
import booleanOperationsProcessor from './booleanOperationsProcessor';
import * as ccl from './ccl-options';
import cclProcessor from './ccl-processor';
import * as duplicate from './duplicate-options';
import duplicateProcessor from './duplicateProcessor';
import * as ed from './ed-options';
import { dilatationProcessor, erosionProcessor } from './ed-processor';
import * as hf from './hf-options';
import hfProcessor from './hf-processor';
import * as ii from './ii-options';
import iiProcessor from './ii-processor';

export type Editor<T> = React.FC<{
  value: T;
  onChange: (value: T) => void;
  activeLabelIndex: number;
  labels: InternalLabel[];
}>;

export const processorTypes = [
  'ccl',
  'filling',
  'erosion',
  'dilation',
  'interpolation',
  'section',
  'duplicate',
  'booleanOperations'
] as const;

export type ProcessorType = typeof processorTypes[number];

export type ProcessorProgress =
  | { readonly value: number; readonly label: string }
  | { readonly finished: boolean };

interface ProcessorInput {
  editingData: EditingData;
  selectedLabel: InternalLabel;
  updateEditingData: EditingDataUpdater;
  /**
   * The callback function to report the processor's progress.
   */
  reportProgress: (progress: ProcessorProgress) => void;
  hints: {
    seriesMetadata: (DicomVolumeMetadata | undefined)[];
    viewers: { [index: string]: Viewer };
    labelColors: string[];
    initialAlpha: number;
  };
}

/**
 * Processor is a function that is invoked after one of the processor menu
 * items was selected. It can take `options` object configured
 * via a setting dialog.
 * A processor must change the current `editingData` using
 * `updateEditingData`.
 * This is a *sync* function. A processor must report its progress
 * using the callback `input.reportProgress`.
 */
export type Processor<T> = (options: T, input: ProcessorInput) => void;

interface ProcessorModalConfiguration<T> {
  title: string;
  optionsEditor: Editor<T>;
  initialOptions: T;
}

interface ProcessorDefinition {
  caption: string;
  labelType: LabelType[];
  processor: Processor<any>;
  settingsModal?: ProcessorModalConfiguration<any>;
}

/**
 * Defines the details of each processor.
 */
export const processors: {
  [key in ProcessorType]: ProcessorDefinition;
} = {
  ccl: {
    caption: 'CCL',
    labelType: ['voxel'],
    settingsModal: {
      title: 'Connected component labeling (CCL)',
      optionsEditor: ccl.OptionsEditor,
      initialOptions: ccl.initialOptions
    },
    processor: cclProcessor
  },
  filling: {
    caption: 'Hole filling',
    labelType: ['voxel'],
    settingsModal: {
      title: 'Hole filling',
      optionsEditor: hf.OptionsEditor,
      initialOptions: hf.initialOptions
    },
    processor: hfProcessor
  },
  erosion: {
    caption: 'Erosion',
    labelType: ['voxel'],
    settingsModal: {
      title: 'Erosion',
      optionsEditor: ed.OptionsEditor,
      initialOptions: ed.initialOptions
    },
    processor: erosionProcessor
  },
  dilation: {
    caption: 'Dilation',
    labelType: ['voxel'],
    settingsModal: {
      title: 'Dilation',
      optionsEditor: ed.OptionsEditor,
      initialOptions: ed.initialOptions
    },
    processor: dilatationProcessor
  },
  interpolation: {
    caption: 'Interslice interpolation',
    labelType: ['voxel'],
    settingsModal: {
      title: 'Interslice interpolation',
      optionsEditor: ii.OptionsEditor,
      initialOptions: ii.initialOptions
    },
    processor: iiProcessor
  },
  section: {
    caption: 'Three points to section',
    labelType: ['point'],
    processor: addNewSctionFromPoints
  },
  duplicate: {
    caption: 'Duplicate',
    labelType: [
      'voxel',
      'rectangle',
      'ellipse',
      'cuboid',
      'ellipsoid',
      'point',
      'ruler'
    ],
    settingsModal: {
      title: 'Duplicate',
      optionsEditor: duplicate.OptionsEditor,
      initialOptions: duplicate.initialOptions
    },
    processor: duplicateProcessor
  },
  booleanOperations: {
    caption: 'Boolean operations',
    labelType: ['voxel'],
    settingsModal: {
      title: 'Boolean operations',
      optionsEditor: bo.OptionsEditor,
      initialOptions: bo.initialOptions
    },
    processor: booleanOperationsProcessor
  }
};
