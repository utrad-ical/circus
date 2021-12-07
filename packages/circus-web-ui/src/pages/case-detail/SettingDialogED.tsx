import { Editor } from '@smikitky/rb-components/lib/editor-types';
import classnames from 'classnames';
import { FormControl } from 'components/react-bootstrap';
import React, { useState } from 'react';
import styled from 'styled-components';
import { ErosionDilationOptions } from './createEdProcessor';
import SettingDialog from './SettingDialog';
import { Structure } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';

const StyledDiv = styled.div`
  line-height: 1;
  .structure-shape {
    display: flex;
    flex-flow: row wrap;
    gap: 10px;
    input {
      width: 5em;
    }
  }
  .slice-number {
    width: 5em;
  }
  .square {
    background: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.primaryText};
    border: 1px solid ${(props: any) => props.theme.border};
    height: 30px;
    width: 30px;
    font-size: 20px;
    line-height: 30px;
    margin-right: -1px;
    margin-top: -1px;
    padding: 0;
    text-align: center;
    &:focus {
      outline: none;
      background: ${(props: any) => props.theme.secondaryBackground};
    }
    &.active {
      background: ${(props: any) => props.theme.brandPrimary};
      &:focus {
        background: ${(props: any) => props.theme.brandDark};
      }
    }
    &.center {
      background: ${(props: any) => props.theme.highlightColor};
    }
  }
  .structure-caption {
    margin-top: 5px;
  }
  .structure-title {
    margin-bottom: 5px;
  }
`;

const Square: React.FC<{
  isCenter: boolean;
  value: number;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}> = props => {
  return (
    <button
      className={classnames('square', {
        center: props.isCenter,
        active: props.value === 1
      })}
      disabled={props.isCenter}
      onClick={props.onClick}
    >
      {props.value}
    </button>
  );
};

const Board: React.FC<{
  structure: Structure;
  sliceNumber: number;
  onChange: (ev: any) => void;
}> = props => {
  const { structure, sliceNumber, onChange } = props;
  const width = [...Array(structure.width).keys()];
  const height = [...Array(structure.height).keys()];
  const onClick = (i: number, j: number) => {
    if (
      i === Math.floor(structure.width / 2) &&
      j === Math.floor(structure.height / 2) &&
      sliceNumber === Math.floor(structure.nSlices / 2)
    )
      return;
    const array = structure.array;
    const pos =
      i +
      j * structure.width +
      sliceNumber * structure.width * structure.height;
    array[pos] = 1 - structure.array[pos];
    onChange(array);
  };
  const isCenter = (i: number, j: number) => {
    return (
      i === Math.floor(structure.width / 2) &&
      j === Math.floor(structure.height / 2) &&
      sliceNumber === Math.floor(structure.nSlices / 2)
    );
  };
  return (
    <div className="board">
      {height.map((_, j) => (
        <div key={j} className="board-row">
          {width.map((_, i) => (
            <Square
              key={i}
              value={
                structure.array[
                  i +
                    j * structure.width +
                    sliceNumber * structure.width * structure.height
                ]
              }
              onClick={() => onClick(i, j)}
              isCenter={isCenter(i, j)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const newStructure = (width: number, height: number, nSlices: number) => {
  const structure = new Uint8Array(width * height * nSlices);
  const center = [
    Math.floor(width / 2),
    Math.floor(height / 2),
    Math.floor(nSlices / 2)
  ];
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const distance =
          ((i - center[0]) ** 2 +
            (j - center[1]) ** 2 +
            (k - center[2]) ** 2) **
          0.5;
        if (distance <= Math.max(...center)) {
          const pos = i + j * width + k * width * height;
          structure[pos] = 1;
        }
      }
    }
  }
  return structure;
};

const OptionsEditorForED: Editor<ErosionDilationOptions> = props => {
  const { value, onChange } = props;
  const [sliceNumber, setSliceNumber] = useState(
    Math.floor(value.structure.nSlices / 2)
  );
  const range = [1, 11];

  const onSliceNumberChange = (ev: any) => {
    if (ev.target.value < 0 || value.structure.nSlices <= ev.target.value)
      return;
    setSliceNumber(Number(ev.target.value));
  };
  const onWidthChange = (ev: any) => {
    if (ev.target.value < range[0] || range[1] < ev.target.value) return;
    const structure = newStructure(
      Number(ev.target.value),
      value.structure.height,
      value.structure.nSlices
    );
    onChange({
      ...value,
      structure: {
        ...value.structure,
        width: Number(ev.target.value),
        array: structure
      }
    });
  };
  const onHeightChange = (ev: any) => {
    if (ev.target.value < range[0] || range[1] < ev.target.value) return;
    const structure = newStructure(
      value.structure.width,
      Number(ev.target.value),
      value.structure.nSlices
    );
    onChange({
      ...value,
      structure: {
        ...value.structure,
        height: Number(ev.target.value),
        array: structure
      }
    });
  };
  const onNSlicesChange = (ev: any) => {
    if (ev.target.value < range[0] || range[1] < ev.target.value) return;
    const structure = newStructure(
      value.structure.width,
      value.structure.height,
      Number(ev.target.value)
    );
    setSliceNumber(Math.floor(Number(ev.target.value) / 2));
    onChange({
      ...value,
      structure: {
        ...value.structure,
        nSlices: Number(ev.target.value),
        array: structure
      }
    });
  };
  const onStructureChange = (array: Uint8Array) => {
    onChange({
      ...value,
      structure: {
        ...value.structure,
        array: array
      }
    });
  };
  return (
    <StyledDiv>
      <div className="structure-shape form-inline">
        <label>
          Width:&ensp;
          <FormControl
            type="number"
            value={value.structure.width}
            name="width"
            onChange={onWidthChange}
          />
        </label>
        <label>
          Height:&ensp;
          <FormControl
            type="number"
            value={value.structure.height}
            name="height"
            onChange={onHeightChange}
          />
        </label>
        <label>
          nSlices:&ensp;
          <FormControl
            type="number"
            value={value.structure.nSlices}
            name="nSlices"
            onChange={onNSlicesChange}
          />
        </label>
      </div>
      <div>
        <div className="structure-title form-inline">
          Structuring element &emsp;(
          <label>
            Slice number =&nbsp;
            <FormControl
              className="slice-number"
              type="number"
              value={sliceNumber}
              name="sliceNumber"
              onChange={onSliceNumberChange}
            />
          </label>
          )
        </div>
        <Board
          structure={value.structure}
          sliceNumber={sliceNumber}
          onChange={onStructureChange}
        />

        <div className="structure-caption">
          <Square value={1} onClick={() => {}} isCenter={true} />
          &nbsp;: origin
        </div>
        <br />
      </div>
    </StyledDiv>
  );
};

const SettingDialogED: React.FC<{
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: ErosionDilationOptions) => void;
  isErosion: boolean;
}> = props => {
  const { processorProgress, onHide, onOkClick, isErosion } = props;
  const title = isErosion ? 'Erosion' : 'Dilation';
  const initialOptions = {
    structure: {
      array: newStructure(3, 3, 3),
      width: 3,
      height: 3,
      nSlices: 3
    },
    isErosion: isErosion
  };

  return (
    <SettingDialog
      title={title}
      optionsEditor={OptionsEditorForED}
      initialOptions={initialOptions}
      processorProgress={processorProgress}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogED;
