import { Editor } from './processor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React from 'react';
import { IntersliceInterpolationOptions } from './ii-processor';
import styled from 'styled-components';

const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

const originIsCenterOptions = {
  Single: 'Single',
  Multi: 'Multiple'
};

export const initialOptions: IntersliceInterpolationOptions = {
  orientation: 'Axial',
  mode: 'Multi'
};

export const OptionsEditor: Editor<IntersliceInterpolationOptions> = props => {
  const { value, onChange } = props;
  return (
    <StyledDiv>
      Orientation
      <ShrinkSelect
        bsSize="sm"
        options={orientationOptions}
        value={value.orientation}
        onChange={v => onChange({ ...value, orientation: v })}
      />
      Mode
      <ShrinkSelect
        bsSize="sm"
        options={originIsCenterOptions}
        value={value.mode}
        onChange={v => onChange({ ...value, mode: v })}
      />
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 5px;
`;
