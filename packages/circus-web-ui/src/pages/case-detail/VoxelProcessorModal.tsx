import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import { Modal } from 'components/react-bootstrap';
import React, { useEffect, useState } from 'react';
import createCclProcessor, { CclOptions } from './createCclProcessor';
import createEdProcessor, { ErosionDilationOptions } from './createEdProcessor';
import createHfProcessor, { HoleFillingOptions } from './createHfProcessor';
import createIiProcessor, {
  IntersliceInterpolationOptions
} from './createIiProcessor';
import createSectionFromPoints from './createSectionFromPoints';
import { InternalLabel, InternalLabelOf } from './labelData';
import performLabelCreatingVoxelProcessing from './performLabelCreatingVoxelProcessing';
import { EditingData, EditingDataUpdater } from './revisionData';
import SettingDialogCCL from './SettingDialogCCL';
import SettingDialogED from './SettingDialogED';
import SettingDialogHF from './SettingDialogHF';
import SettingDialogII from './SettingDialogII';
import { ProcessorDialogKey } from './voxelprocessor-types';

const voxelProcessorModalProperties = {
  ccl: {
    SettingDialog: SettingDialogCCL,
    processor: createCclProcessor,
    onOkClick: (
      editingData: EditingData,
      updateEditingData: EditingDataUpdater,
      label: InternalLabel,
      labelColors: string[],
      reportProgress: (progress: { value: number; label: string }) => void,
      metadata: (DicomVolumeMetadata | undefined)[],
      viewers: { [index: string]: Viewer }
    ) => {
      if (label.type !== 'voxel') return (props: CclOptions) => {};
      return (props: CclOptions) => {
        performLabelCreatingVoxelProcessing<LabelingResults3D>(
          editingData,
          updateEditingData,
          label,
          labelColors,
          createCclProcessor(props),
          cclProgress => reportProgress(cclProgress)
        );
      };
    }
  },
  filling: {
    SettingDialog: SettingDialogHF,
    processor: createHfProcessor,
    onOkClick: (
      editingData: EditingData,
      updateEditingData: EditingDataUpdater,
      label: InternalLabel,
      labelColors: string[],
      reportProgress: (progress: { value: number; label: string }) => void,
      metadata: (DicomVolumeMetadata | undefined)[],
      viewers: { [index: string]: Viewer }
    ) => {
      if (label.type !== 'voxel') return (props: HoleFillingOptions) => {};
      return (props: HoleFillingOptions) => {
        performLabelCreatingVoxelProcessing<LabelingResults3D>(
          editingData,
          updateEditingData,
          label,
          labelColors,
          createHfProcessor(props),
          fillingProgress => reportProgress(fillingProgress)
        );
      };
    }
  },
  erosion: {
    SettingDialog: SettingDialogED(true),
    processor: createEdProcessor,
    onOkClick: (
      editingData: EditingData,
      updateEditingData: EditingDataUpdater,
      label: InternalLabel,
      labelColors: string[],
      reportProgress: (progress: { value: number; label: string }) => void,
      metadata: (DicomVolumeMetadata | undefined)[],
      viewers: { [index: string]: Viewer }
    ) => {
      if (label.type !== 'voxel') return (props: ErosionDilationOptions) => {};
      return (props: ErosionDilationOptions) => {
        performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
          editingData,
          updateEditingData,
          label,
          labelColors,
          createEdProcessor(props),
          erosionProgress => reportProgress(erosionProgress)
        );
      };
    }
  },
  dilation: {
    SettingDialog: SettingDialogED(false),
    processor: createEdProcessor,
    onOkClick: (
      editingData: EditingData,
      updateEditingData: EditingDataUpdater,
      label: InternalLabel,
      labelColors: string[],
      reportProgress: (progress: { value: number; label: string }) => void,
      metadata: (DicomVolumeMetadata | undefined)[],
      viewers: { [index: string]: Viewer }
    ) => {
      if (label.type !== 'voxel') return (props: ErosionDilationOptions) => {};
      return (props: ErosionDilationOptions) => {
        performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
          editingData,
          updateEditingData,
          label,
          labelColors,
          createEdProcessor(props),
          dilationProgress => reportProgress(dilationProgress)
        );
      };
    }
  },
  interpolation: {
    SettingDialog: SettingDialogII,
    processor: createIiProcessor,
    onOkClick: (
      editingData: EditingData,
      updateEditingData: EditingDataUpdater,
      label: InternalLabel,
      labelColors: string[],
      reportProgress: (progress: { value: number; label: string }) => void,
      metadata: (DicomVolumeMetadata | undefined)[],
      viewers: { [index: string]: Viewer }
    ) => {
      if (label.type !== 'voxel') return (props: CclOptions) => {};
      return (props: IntersliceInterpolationOptions) => {
        performLabelCreatingVoxelProcessing<MorphologicalImageProcessingResults>(
          editingData,
          updateEditingData,
          label,
          labelColors,
          createIiProcessor(props),
          interpolationProgress => reportProgress(interpolationProgress)
        );
      };
    }
  },

  section: {
    SettingDialog: undefined,
    processor: createSectionFromPoints,
    onOkClick: (
      editingData: EditingData,
      updateEditingData: EditingDataUpdater,
      label: InternalLabel,
      labelColors: string[],
      reportProgress: (progress: { value: number; label: string }) => void,
      metadata: (DicomVolumeMetadata | undefined)[],
      viewers: { [index: string]: Viewer }
    ) => {
      return () => {
        try {
          const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
          const activeSeriesMetadata = metadata[activeSeriesIndex];
          const activeSeries = revision.series[activeSeriesIndex];
          const activeLabel =
            activeLabelIndex >= 0
              ? activeSeries.labels[activeLabelIndex]
              : null;
          const seriesIndex = Number(
            Object.keys(editingData.revision.series).find(ind =>
              editingData.revision.series[Number(ind)].labels.find(
                item => item.temporaryKey === activeLabel!.temporaryKey
              )
            )
          );
          const spareKey = Object.keys(editingData.layout.positions).find(
            key =>
              editingData.layoutItems.find(item => item.key === key)!
                .seriesIndex === seriesIndex
          );
          const useActiveLayoutKey = Object.keys(editingData.layout.positions)
            .filter(
              key =>
                editingData.layoutItems.find(item => item.key === key)!
                  .seriesIndex === seriesIndex
            )
            .some(key => key === editingData.activeLayoutKey);
          const targetLayoutKey = useActiveLayoutKey
            ? editingData.activeLayoutKey
            : spareKey;
          const [newLayoutItems, newLayout, key] = createSectionFromPoints(
            editingData.revision.series[activeSeriesIndex].labels.filter(
              label => {
                return (
                  label.type === 'point' &&
                  !(activeSeriesMetadata?.mode !== '3d')
                );
              }
            ) as InternalLabelOf<'point'>[],
            activeLabel!.name!,
            (viewers[targetLayoutKey!].getState() as any).section,
            editingData.layout,
            editingData.layoutItems,
            activeSeriesIndex
          );
          updateEditingData((d: EditingData) => {
            d.layoutItems = newLayoutItems;
            d.layout = newLayout;
            d.activeLayoutKey = key;
          });
        } catch (err: any) {
          alert(err.message);
        }
      };
    }
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
        ].onOkClick(
          editingData,
          updateEditingData,
          label,
          labelColors,
          props => {},
          metadata,
          viewers
        ) as () => void;
        updator();
        return onHide();
      }
    }
  });

  if (processorDialogKey === '') return <></>;
  const SettingDialog =
    voxelProcessorModalProperties[processorDialogKey].SettingDialog;
  if (SettingDialog) {
    const onOkClick = voxelProcessorModalProperties[
      processorDialogKey
    ].onOkClick(
      editingData,
      updateEditingData,
      label,
      labelColors,
      props => {
        setProcessorProgress(props);
        if (props.label !== '') {
          setProcessorProgress({
            value: 0,
            label: ''
          });
          onHide();
        }
      },
      metadata,
      viewers
    );
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
