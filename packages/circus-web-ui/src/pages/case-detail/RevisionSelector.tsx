import React from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import TimeDisplay from 'components/TimeDisplay';
import UserDisplay from 'components/UserDisplay';
import styled from 'styled-components';
import { Revision } from './revisionData';
import { ExternalLabel } from './labelData';

const Item: React.FC<{ value: Revision<ExternalLabel> }> = React.memo(props => {
  const revision = props.value;
  return (
    <span className="revision-selector-item">
      <span className="date">
        <TimeDisplay value={revision.date} />
      </span>
      <span className="status label label-default">{revision.status}</span>
      <span className="description">{revision.description}</span>
      <span className="creator">
        <UserDisplay userEmail={revision.creator} />
      </span>
    </span>
  );
});

const RevisionSelector: React.FC<{
  revisions: Revision<ExternalLabel>[];
  selected: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}> = React.memo(props => {
  const { onSelect, revisions = [], selected, disabled } = props;

  const handleSelect = (value: string) => {
    const index = parseInt(/(\d+)$/.exec(value)![1]);
    onSelect(index);
  };

  // We have to use string keys to preserve item order
  const opts: { [key: string]: { caption: React.ReactChild } } = {};
  revisions
    .slice()
    .reverse()
    .forEach((r, i) => {
      const originalIndex = revisions.length - i - 1;
      opts[`rev${originalIndex}`] = { caption: <Item value={r} /> };
    });
  const sel = `rev${selected}`;
  return (
    <StyledShrinkSelect
      options={opts}
      value={sel}
      onChange={handleSelect}
      disabled={disabled}
    />
  );
});

const StyledShrinkSelect = styled(ShrinkSelect)`
  .revision-selector-item > span {
    margin: 0 3px;
  }
  .description {
    font-weight: bold;
  }
`;

export default RevisionSelector;
