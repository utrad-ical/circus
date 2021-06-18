import React, { useState } from 'react';
import SettimgDialog from './SettingDialog';
import * as et from '@smikitky/rb-components/lib/editor-types';

interface parameterType {
  dimension: 2 | 3;
  neighbors4or6: 1 | 2;
  orientation: 'Axial' | 'Coronal' | 'Sagital';
}

const neighborsOptions2D = {
  1: '4-neigobors',
  2: '8-neigobors'
};
const neighborsOptions3D = {
  1: '6-neigobors',
  2: '26-neigobors'
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

const initialValues = {
  dimension: 2,
  neighbors4or6: 1,
  orientation: 'Axial'
};

const SettingDialogHoleFilling: React.FC<{
  onHide: () => void;
  onOkClick: (
    dimension: number,
    orientation: 'Axial' | 'Coronal' | 'Sagital' | null,
    neighbors4or6: boolean
  ) => void;
}> = React.memo(props => {
  const { onHide, onOkClick } = props;
  const [holeFillingProperties, setHoleFillingProperties] = useState([
    {
      key: 'dimension',
      caption: 'Dimension',
      editor: et.shrinkSelect(dimensionOptions)
    },
    {
      key: 'orientation',
      caption: 'Orientation',
      editor: et.shrinkSelect(orientationOptions)
    },
    {
      key: 'neighbors4or6',
      caption: 'Neighbors to decide same CC',
      editor: et.shrinkSelect(neighborsOptions2D)
    }
  ]);
  const handlePropertiesChange = (parameters: parameterType) => {
    setHoleFillingProperties(
      Number(parameters.dimension) === 3
        ? [
            {
              key: 'dimension',
              caption: 'Dimension',
              editor: et.shrinkSelect(dimensionOptions)
            },
            {
              key: 'neighbors4or6',
              caption: 'Neighbors to decide same CC',
              editor: et.shrinkSelect(neighborsOptions3D)
            }
          ]
        : [
            {
              key: 'dimension',
              caption: 'Dimension',
              editor: et.shrinkSelect(dimensionOptions)
            },
            {
              key: 'orientation',
              caption: 'Orientation',
              editor: et.shrinkSelect(orientationOptions)
            },
            {
              key: 'neighbors4or6',
              caption: 'Neighbors to decide same CC',
              editor: et.shrinkSelect(neighborsOptions2D)
            }
          ]
    );
  };

  return (
    <SettimgDialog
      title="Setting options for connected component labeling (CCL)"
      initialValues={initialValues}
      properties={holeFillingProperties}
      onChange={handlePropertiesChange}
      onHide={() => onHide()}
      onOkClick={(parameters: parameterType) => {
        onOkClick(
          Number(parameters.dimension),
          parameters.orientation,
          Number(parameters.neighbors4or6) === 1
        );
      }}
    />
  );
});

export default SettingDialogHoleFilling;
