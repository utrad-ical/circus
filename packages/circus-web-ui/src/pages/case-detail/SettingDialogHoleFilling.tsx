import { Button, Modal } from 'components/react-bootstrap';
import React, { useState } from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';

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
    orientation: string,
    neighbors4or6: boolean
  ) => void;
}> = React.memo(props => {
  const { onHide, onOkClick } = props;
  const [neighbor4or6, setNeighbor4or6] = useState(false);
  const [dimension3, setDimension3] = useState(true);
  const [orientation, setOrientation] = useState('Axial');
  return (
    <>
      <Modal.Header>
        <Modal.Title>Hole filling</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          Dimension: &ensp;
          <ShrinkSelect
            bsSize="sm"
            options={dimensionOptions}
            numericalValue
            value={dimension3 ? 3 : 2}
            onChange={(value: number) => setDimension3(value === 3)}
          />
          {!dimension3 && (
            <React.Fragment>
              &emsp; Orientation: &ensp;
              <ShrinkSelect
                bsSize="sm"
                options={orientationOptions}
                value={orientation}
                onChange={(value: string) => setOrientation(value)}
              />
            </React.Fragment>
          )}
        </div>
        <div>
          Neighbors to decide same connected component: &ensp;
          <ShrinkSelect
            bsSize="sm"
            options={dimension3 ? neighborsOptions3D : neighborsOptions2D}
            numericalValue
            value={neighbor4or6 ? (dimension3 ? 6 : 4) : dimension3 ? 26 : 8}
            onChange={(value: number) =>
              setNeighbor4or6(value == 6 || value == 4)
            }
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onHide()}>
          Cancel
        </Button>
        <Button
          onClick={() => onOkClick(dimension3, orientation, neighbor4or6)}
          bsStyle="primary"
        >
          OK
        </Button>
      </Modal.Footer>
    </>
  );
});

export default SettingDialogHoleFilling;
