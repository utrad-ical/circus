import React, { useState } from 'react';
import SettimgDialog from './SettingDialog';

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

const SettingDialogCCL: React.FC<{
  onHide: () => void;
  onOkClick: (dispLabelNumber: number, neighbors: boolean) => void;
}> = React.memo(props => {
  const { onHide, onOkClick } = props;
  const [neighbor6, setNeighbor6] = useState(false);
  const [dispLabelNumber, setDispLabelNumber] = useState(2);
  return (
    <SettimgDialog
      title="Setting options for connected component labeling (CCL)"
      properties={[
        {
          title: 'Maximum number of connected components (CCs) to display',
          value: dispLabelNumber,
          numericalValue: true,
          options: maximumCCNumOptions,
          onChange: (value: number) => setDispLabelNumber(value)
        },
        {
          title: 'Neighbors to decide same CC',
          value: neighbor6 ? 6 : 26,
          numericalValue: true,
          options: neighborsOptions,
          onChange: (value: number) => setNeighbor6(Number(value) == 6)
        }
      ]}
      onHide={() => onHide()}
      onOkClick={() => onOkClick(dispLabelNumber, neighbor6)}
    />
  );
});

export default SettingDialogCCL;
