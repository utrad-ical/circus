import React from 'react';
import { format, isValid } from 'date-fns';

const TimeDisplay: React.FC<{
  /**
   * ISO Time string.
   */
  value: string | null | undefined;
  invalidLabel?: string;
}> = props => {
  const { value, invalidLabel = '' } = props;
  const date = value ? new Date(value) : undefined;
  if (!date || !isValid(date)) return <span>{invalidLabel}</span>;
  return (
    <span title={value ?? undefined}>{format(date, 'yyyy-MM-dd HH:mm')}</span>
  );
};

export default TimeDisplay;
