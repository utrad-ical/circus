import React from 'react';
import SettimgDialog from './SettingDialog';
import * as et from '@smikitky/rb-components/lib/editor-types';

interface parameterType {
  maximumCcNum: number;
  neighbors: 6 | 26;
}

const maximumCCNumOptions = {
  1: '1 CC',
  2: '2 CCs',
  3: '3 CCs',
  4: '4 CCs',
  5: '5 CCs',
  6: '6 CCs',
  7: '7 CCs',
  8: '8 CCs',
  9: '9 CCs',
  10: '10 CCs'
};
const neighborsOptions = {
  6: '6-neigobors',
  26: '26-neigobors'
};

const initialValues = {
  maximumCcNum: 2,
  neighbors: 6
};

const cclProperties = [
  {
    key: 'maximumCcNum',
    caption: 'Maximum number of connected components (CCs) to display',
    editor: et.shrinkSelect(maximumCCNumOptions)
  },
  {
    key: 'neighbors',
    caption: 'Neighbors to decide same CC',
    editor: et.shrinkSelect(neighborsOptions)
  }
];

const SettingDialogCCL: React.FC<{
  onHide: () => void;
  onOkClick: (dispLabelNumber: number, neighbors: number) => void;
}> = React.memo(props => {
  const { onHide, onOkClick } = props;

  return (
    <SettimgDialog
      title="Setting options for connected component labeling (CCL)"
      initialValues={initialValues}
      properties={cclProperties}
      onHide={() => onHide()}
      onOkClick={(parameters: parameterType) => {
        onOkClick(
          Number(parameters.maximumCcNum),
          Number(parameters.neighbors)
        );
      }}
    />
  );
});

export default SettingDialogCCL;
