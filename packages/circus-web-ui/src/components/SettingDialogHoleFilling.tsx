import { Button, Modal } from 'components/react-bootstrap';
import React, { useState } from 'react';

const SettingDialogHoleFilling: React.FC<{
  onHide: () => void;
  onClick: (
    dimension3: boolean,
    orientation: string,
    neighbors4or6: boolean
  ) => void;
}> = props => {
  const { onHide, onClick } = props;
  const [neighbor4or6, setNeighbor4or6] = useState(false);
  const [dimension3, setDimension3] = useState(true);
  const [orientation, setOrientation] = useState('Axial');

  return (
    <>
      <Modal.Body>
        <p>Setting option for hole filling</p>
        <label>
          Dimension :{dimension3 ? 3 : 2}D
          <ul>
            <li>
              <label>
                3D
                <input
                  type="radio"
                  checked={dimension3}
                  onChange={() => setDimension3(true)}
                ></input>
              </label>
            </li>
            <li>
              <label>
                2D
                <input
                  type="radio"
                  checked={!dimension3}
                  onChange={() => setDimension3(false)}
                ></input>
              </label>
            </li>
          </ul>
        </label>
        <br />
        {!dimension3 && (
          <label>
            Orientation :
            <select
              value={orientation}
              onChange={e => setOrientation(e.target.value)}
            >
              <option>Axial</option>
              <option>Colonal</option>
              <option>Sagital</option>
            </select>
          </label>
        )}
        <br />
        <label>
          Neighbors to decide same connected component :
          {neighbor4or6 ? (dimension3 ? 6 : 4) : dimension3 ? 26 : 8}
          <ul>
            <li>
              <label>
                {dimension3 ? 6 : 4}-neigobors
                <input
                  type="radio"
                  checked={neighbor4or6}
                  onChange={() => setNeighbor4or6(true)}
                ></input>
              </label>
            </li>
            <li>
              <label>
                {dimension3 ? 26 : 8}-neigobors
                <input
                  type="radio"
                  checked={!neighbor4or6}
                  onChange={() => setNeighbor4or6(false)}
                ></input>
              </label>
            </li>
          </ul>
        </label>
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onHide()}>
          Cancel
        </Button>
        <Button
          onClick={() => onClick(dimension3, orientation, neighbor4or6)}
          bsStyle="primary"
        >
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SettingDialogHoleFilling;
