import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { Modal } from 'components/react-bootstrap';
import React, { useEffect, useState } from 'react';
import createCclProcessor from './createCclProcessor';
import createEdProcessor from './createEdProcessor';
import createHfProcessor from './createHfProcessor';
import createIiProcessor from './createIiProcessor';
import addNewSctionFromPoints from './addNewSctionFromPoints';
import { InternalLabel } from './labelData';
import performLabelCreatingVoxelProcessing from './performLabelCreatingVoxelProcessing';
import { EditingData, EditingDataUpdater } from './revisionData';
import SettingDialogCCL from './SettingDialogCCL';
import SettingDialogED from './SettingDialogED';
import SettingDialogHF from './SettingDialogHF';
import SettingDialogII from './SettingDialogII';
import {
  ProcessorDialogKey,
  ProcessorInput,
  SettingDialogProperty
} from './voxelprocessor-types';

type VoxelProcessorModalProperty = {
  SettingDialog: React.FC<SettingDialogProperty> | undefined;
  processor: Function;
};
type VoxelProcessorModalPropertyType =
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
    SettingDialog: SettingDialogCCL,
    processor: createCclProcessor
  },
  filling: {
    SettingDialog: SettingDialogHF,
    processor: createHfProcessor
  },
  erosion: {
    SettingDialog: SettingDialogED(true),
    processor: createEdProcessor
  },
  dilation: {
    SettingDialog: SettingDialogED(false),
    processor: createEdProcessor
  },
  interpolation: {
    SettingDialog: SettingDialogII,
    processor: createIiProcessor
  },

  section: {
    SettingDialog: undefined,
    processor: addNewSctionFromPoints
  }
};

const VoxelProcessorModal: React.FC<{
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
  const [processorProgress, setProcessorProgress] = useState({
    value: 0,
    label: ''
  });

  useEffect(() => {
    if (processorDialogKey !== '') {
      const SettingDialog =
        voxelProcessorModalProperties[processorDialogKey].SettingDialog;

      if (!SettingDialog) {
        const updator = voxelProcessorModalProperties[
          processorDialogKey
        ].processor({
          editingData,
          updateEditingData,
          metadata,
          viewers
        }) as () => void;
        updator();
        return onHide();
      }
    }
  });

  if (processorDialogKey === '') return <></>;
  const SettingDialog =
    voxelProcessorModalProperties[processorDialogKey].SettingDialog;
  if (SettingDialog) {
    const processor =
      voxelProcessorModalProperties[processorDialogKey].processor;
    const onOkClick = (
      label.type !== 'voxel'
        ? (props: ProcessorInput<VoxelProcessorModalPropertyType>) => {}
        : (props: ProcessorInput<VoxelProcessorModalPropertyType>) => {
            performLabelCreatingVoxelProcessing<any>(
              editingData,
              updateEditingData,
              label,
              labelColors,
              processor(props),
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
          }
    ) as (props: any) => void;

    return (
      <Modal show={processorDialogKey.length > 0} onHide={onHide}>
        <SettingDialog
          processorProgress={processorProgress}
          onHide={onHide}
          onOkClick={onOkClick}
        />
      </Modal>
    );
  } else return <></>;
};

export default VoxelProcessorModal;
