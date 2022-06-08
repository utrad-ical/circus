import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import LabelDropdown, { Label } from '../LabelDropdown';
import { CalculatorOptions } from './calculatorProcessor';
import { Editor } from './processor-types';

const operationOptions = {
  Add: ' + (add)',
  Subtract: ' - (subtract)',
  Intersect: ' ∩ (intersect)'
};

export const initialOptions: CalculatorOptions = {
  operation: 'Add',
  targetLabelIndex: -1
};

export const OptionsEditor: Editor<CalculatorOptions> = props => {
  const { value, onChange, activeLabelIndex, labels } = props;
  const targetIndex = labels.flatMap((label, ind) =>
    label.type === 'voxel' ? ind : []
  );
  const voxelLabels = targetIndex.map(i => labels[i]);
  const initialLabelIndex =
    activeLabelIndex === targetIndex[0] && 1 < targetIndex.length ? 1 : 0;
  useEffect(() => {
    if (value.targetLabelIndex < 0) {
      onChange({
        ...value,
        targetLabelIndex: targetIndex[initialLabelIndex]
      });
    }
  }, []);
  const handleSelectLabel2 = (i: number) => {
    onChange({
      ...value,
      targetLabelIndex: targetIndex[i]
    });
  };
  return (
    <StyledDiv>
      <div>label1:</div>
      <Label label={labels[activeLabelIndex]} />
      <div>Operation:</div>
      <ShrinkSelect
        bsSize="sm"
        options={operationOptions}
        value={value.operation}
        onChange={v => {
          onChange({ ...value, operation: v });
        }}
      />
      <div>label2:</div>
      <LabelDropdown
        labels={voxelLabels}
        onSelect={handleSelectLabel2}
        initialLabelIndex={initialLabelIndex}
      />
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  grid-gap: 5px;
`;
