import Badge from '#components/Badge.tsx';
import React from 'react';
import Select from '#components/Select.tsx';
import TimeDisplay from '#components/TimeDisplay.tsx';
import UserDisplay from '#components/UserDisplay.tsx';
import type { SelectOptions } from '#utils/normalizeOptions.ts';
import type { Revision } from './revisionData.ts';
import type { ExternalLabel } from './labelData.ts';
import styles from './RevisionSelector.module.css';

const Item: React.FC<{ value: Revision<ExternalLabel> }> = React.memo(props => {
  const revision = props.value;
  return (
    <span className={styles.item}>
      <span className="date">
        <TimeDisplay value={revision.date} />
      </span>
      <Badge className="status">{revision.status}</Badge>
      <span className={styles.description}>{revision.description}</span>
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
    <Select
      className={styles.revisionSelect}
      // Captions are elements, which Select renders as they are
      options={opts as SelectOptions}
      value={sel}
      onChange={handleSelect}
      disabled={disabled}
    />
  );
});

export default RevisionSelector;
