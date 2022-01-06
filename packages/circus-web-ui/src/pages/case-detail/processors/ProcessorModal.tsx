import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { Modal } from 'components/react-bootstrap';
import React, { useEffect, useState } from 'react';
import createCclProcessor from './createCclProcessor';
import createEdProcessor from './createEdProcessor';
import createHfProcessor from './createHfProcessor';
import createIiProcessor from './createIiProcessor';
import addNewSctionFromPoints from './addNewSctionFromPoints';
import { InternalLabel } from '../labelData';
import performLabelCreatingVoxelProcessing from './performLabelCreatingVoxelProcessing';
import { EditingData, EditingDataUpdater } from '../revisionData';
import SettingDialogCCL from './SettingDialogCCL';
import {
  SettingDialogErosion,
  SettingDialogDilatation
} from './SettingDialogED';
import SettingDialogHF from './SettingDialogHF';
import SettingDialogII from './SettingDialogII';
import {
  ProcessorDialogKey,
  CustomSettingDialog,
  ProcessorProgress
} from './processor-types';

type VoxelProcessorModalProperty = {
  settingDialog: CustomSettingDialog<any> | undefined;
  processor: Function;
};

export type VoxelProcessorModalPropertyType =
  | 'ccl'
  | 'filling'
  | 'erosion'
  | 'dilation'
  | 'interpolation';

const voxelProcessorModalProperties: {
  [key in
    | VoxelProcessorModalPropertyType
    | 'section']: VoxelProcessorModalProperty;
} = {
  ccl: {
    settingDialog: SettingDialogCCL,
    processor: createCclProcessor
  },
  filling: {
    settingDialog: SettingDialogHF,
    processor: createHfProcessor
  },
  erosion: {
    settingDialog: SettingDialogErosion,
    processor: createEdProcessor
  },
  dilation: {
    settingDialog: SettingDialogDilatation,
    processor: createEdProcessor
  },
  interpolation: {
    settingDialog: SettingDialogII,
    processor: createIiProcessor
  },
  section: {
    settingDialog: undefined,
    processor: addNewSctionFromPoints
  }
};

const ProcessorModal: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  label: InternalLabel;
  labelColors: string[];
  processorDialogKey: ProcessorDialogKey;
  onHide: () => void;
  metadata: (DicomVolumeMetadata | undefined)[];
  viewers: { [index: string]: Viewer };
}> = props => {
  const {
    editingData,
    updateEditingData,
    label,
    labelColors,
    processorDialogKey,
    onHide,
    metadata,
    viewers
  } = props;

  const [processorProgress, setProcessorProgress] = useState<ProcessorProgress>(
    {
      value: 0,
      label: ''
    }
  );

  useEffect(() => {
    if (processorDialogKey !== '') {
      const SettingDialog =
        voxelProcessorModalProperties[processorDialogKey].settingDialog;

      if (!SettingDialog) {
        const processor = voxelProcessorModalProperties[
          processorDialogKey
        ].processor({
          editingData,
          updateEditingData,
          metadata,
          viewers
        });
        processor();
        return onHide();
      }
    }
  });

  if (processorDialogKey === '') return null;
  const SettingDialog =
    voxelProcessorModalProperties[processorDialogKey].settingDialog;

  if (SettingDialog) {
    const processor =
      voxelProcessorModalProperties[processorDialogKey].processor;
    const onOkClick = (options: any) => {
      if (label.type !== 'voxel') return;
      performLabelCreatingVoxelProcessing<any>(
        editingData,
        updateEditingData,
        label,
        labelColors,
        processor(options),
        progress => {
          setProcessorProgress(progress);
          if (progress.label !== '') {
            setProcessorProgress({
              value: 0,
              label: ''
            });
            onHide();
          }
        }
      );
    };

    return (
      <Modal show={processorDialogKey.length > 0} onHide={onHide}>
        <SettingDialog
          processorProgress={processorProgress}
          onHide={onHide}
          onOkClick={onOkClick}
        />
      </Modal>
    );
  } else return null;
};

export default ProcessorModal;
