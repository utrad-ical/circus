import React, { useState } from 'react';
import SettimgDialog from './SettingDialog';

const neighborsOptions2D = {
  4: '4-neigobors',
  8: '8-neigobors'
};
const neighborsOptions3D = {
  6: '6-neigobors',
  26: '26-neigobors'
};
const dimensionOptions = {
  2: '2D',
  3: '3D'
};
const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

const SettingDialogHoleFilling: React.FC<{
  onHide: () => void;
  onOkClick: (
    dimension3: boolean,
    orientation: 'Axial' | 'Coronal' | 'Sagital' | null,
    neighbors4or6: boolean
  ) => void;
}> = React.memo(props => {
  const { onHide, onOkClick } = props;
  const [neighbors4or6, setNeighbors4or6] = useState(false);
  const [dimension3, setDimension3] = useState(true);
  const [orientation, setOrientation] = useState<
    'Axial' | 'Coronal' | 'Sagital' | null
  >('Axial');
  const properties: {
    title: string;
    value: any;
    numericalValue: boolean;
    onChange: (value: any) => void;
    options: { [type: string]: string };
  }[] = [
    {
      title: 'Dimension',
      value: dimension3 ? 3 : 2,
      numericalValue: true,
      options: dimensionOptions,
      onChange: (value: number) => setDimension3(value === 3)
    }
  ];
  if (!dimension3) {
    properties.push({
      title: 'Orientation',
      value: orientation,
      numericalValue: false,
      options: orientationOptions,
      onChange: (value: 'Axial' | 'Coronal' | 'Sagital' | null) => {
        setOrientation(value);
      }
    });
  }
  properties.push({
    title: 'Neighbors to decide same connected component',
    value: neighbors4or6 ? (dimension3 ? 6 : 4) : dimension3 ? 26 : 8,
    numericalValue: true,
    options: dimension3 ? neighborsOptions3D : neighborsOptions2D,
    onChange: (value: number) => setNeighbors4or6(value == 6 || value == 4)
  });

  return (
    <SettimgDialog
      title="Hole filling"
      properties={properties}
      onHide={() => onHide()}
      onOkClick={() => onOkClick(dimension3, orientation, neighbors4or6)}
    />
  );
});

export default SettingDialogHoleFilling;
