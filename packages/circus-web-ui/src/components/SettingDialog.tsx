import { Button, Modal } from 'components/react-bootstrap';
import React, { useState } from 'react';

const SettingDialog: React.FC<{
  onHide: () => void;
  onClick: (dispLabelNumber: number, neighbors: 6 | 26) => void;
}> = props => {
  const { onHide, onClick } = props;
  const [neighbor6, setNeighbor6] = useState(false);
  const [dispLabelNumber, setDispLabelNumber] = useState(2);

  return (
    <>
      <Modal.Body>
        <p>Setting option for connected component labeling (CCL)</p>
        <label>
          Maximum number of connected component labels to display (1-10) :
          {dispLabelNumber}
          <input
            type="range"
            min="1"
            max="10"
            value={dispLabelNumber}
            onChange={ev => setDispLabelNumber(Number(ev.target.value))}
          ></input>
        </label>

        <label>
          Neighbors to decide same connected component :{neighbor6 ? 6 : 26}
          <ul>
            <li>
              <label>
                6-neigobors
                <input
                  type="radio"
                  checked={neighbor6}
                  onChange={() => setNeighbor6(true)}
                ></input>
              </label>
            </li>
            <li>
              <label>
                26-neigobors
                <input
                  type="radio"
                  checked={!neighbor6}
                  onChange={() => setNeighbor6(false)}
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
          onClick={() => onClick(dispLabelNumber, neighbor6 ? 6 : 26)}
          bsStyle="primary"
        >
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SettingDialog;
