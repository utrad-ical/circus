import { Editor } from '@smikitky/rb-components/lib/editor-types';
import classnames from 'classnames';
import { FormControl } from 'components/react-bootstrap';
import React, { useState } from 'react';
import styled from 'styled-components';
import { DuplicateOptions } from './createDuplicateProcessor';
import SettingDialog from './SettingDialog';

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

const OptionsEditorForDuplicate: Editor<DuplicateOptions> = props => {
  const { value, onChange } = props;

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

const SettingDialogDuplicate: React.FC<{
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: ErosionDilationOptions) => void;
  name: string;
}> = props => {
  const { processorProgress, onHide, onOkClick, name } = props;
  const initialOptions = {
    newName: `duplicated ${name}`,
    complement: false
  };

  return (
    <SettingDialog
      title="Duplicate"
      optionsEditor={OptionsEditorForED}
      initialOptions={initialOptions}
      processorProgress={processorProgress}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogDuplicate;
