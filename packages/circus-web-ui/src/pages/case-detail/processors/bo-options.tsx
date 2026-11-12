import Select from '#components/Select.tsx';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import LabelDisplay from '../LabelDisplay.tsx';
import type {
  BooleanOperationsOptions,
  BooleanOperationType
} from './booleanOperationsProcessor.ts';
import { booleanOperationTypes } from './booleanOperationsProcessor.ts';
import type { Editor } from './processor-types.ts';

const RenderOperationType: React.FC<{
  caption: BooleanOperationType;
}> = props => {
  const { caption } = props;
  const map: Record<BooleanOperationType, [string, string]> = {
    add: ['+', 'Add'],
    subtract: ['-', 'Subtract'],
    intersect: ['∩', 'Intersect']
  };
  return (
    <StyledSpan>
      <span className="symbol">{map[caption][0]}</span> ({map[caption][1]})
    </StyledSpan>
  );
};

const StyledSpan = styled.span`
  > .symbol {
    display: inline-block;
    width: 20px;
    font-weight: bolder;
    text-align: center;
  }
`;

export const initialOptions: BooleanOperationsOptions = {
  operation: 'add',
  targetLabelIndex: -1 // unselected
};

export const OptionsEditor: Editor<BooleanOperationsOptions> = props => {
  const { value, onChange, activeLabelIndex, labels } = props;

  const targetIndexes = labels.flatMap((label, idx) =>
    label.type === 'voxel' && idx !== activeLabelIndex ? idx : []
  );

  const handleSelectLabel2 = (key: string) => {
    const targetLabelIndex = labels.findIndex(f => f.temporaryKey === key);
    onChange({ ...value, targetLabelIndex });
  };

  const options = useMemo(
    () => ['unselected', ...targetIndexes.map(i => labels[i].temporaryKey)],
    [targetIndexes, labels]
  );

  const RenderLabel = useCallback(
    (props: { caption: string }) => {
      if (props.caption === 'unselected') return <>Select Label...</>;
      const label = labels.find(l => l.temporaryKey === props.caption)!;
      return (
        <div style={{ display: 'inline-block' }}>
          <LabelDisplay label={label} />
        </div>
      );
    },
    [labels]
  );

  return (
    <StyledDiv>
      <div>Label1:</div>
      <LabelDisplay label={labels[activeLabelIndex]} />
      <div>Operation:</div>
      <Select
        size="small"
        options={booleanOperationTypes as unknown as string[]}
        value={value.operation}
        onChange={operation => onChange({ ...value, operation })}
        renderer={RenderOperationType}
      />
      <div>Label2:</div>
      <Select
        size="small"
        options={options}
        value={labels[value.targetLabelIndex]?.temporaryKey ?? 'unselected'}
        onChange={handleSelectLabel2}
        renderer={RenderLabel}
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
