import { Modal } from 'components/react-bootstrap';
import React from 'react';
import {
  CustomSettingDialog,
  Processor,
  ProcessorDialogKey,
  processorModalPropertyKey,
  ProcessorModalPropertyType,
  ProcessorProgress,
  processorProperties
} from './processor-types';

const ProcessorModal: React.FC<{
  processorDialogKey: ProcessorDialogKey;
  onHide: () => void;
  setProcessor: React.Dispatch<React.SetStateAction<Processor>>;
  processorProgress: ProcessorProgress;
}> = props => {
  const { processorDialogKey, onHide, setProcessor, processorProgress } = props;
  if (
    processorDialogKey === '' ||
    processorModalPropertyKey.every(key => key !== processorDialogKey)
  ) {
    return null;
  }
  const _processorDialogKey = processorDialogKey as ProcessorModalPropertyType;
  const SettingDialog = processorProperties[_processorDialogKey]
    .settingDialog as CustomSettingDialog<any>;

  const processor = processorProperties[_processorDialogKey].processor;
  const update = processorProperties[_processorDialogKey].update;
  const onOkClick = (options: any) => {
    setProcessor({ processor: processor(options), update: update });
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
};

export default ProcessorModal;
