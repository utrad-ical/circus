import React from 'react';
import { format, isValid } from 'date-fns';

const TimeDisplay: React.FC<{
  /**
   * ISO Time string.
   */
  value: string;
  invalidLabel?: string;
}> = props => {
  const { value, invalidLabel = '' } = props;
  const date = new Date(value);
  if (!isValid(date)) return <span>{invalidLabel}</span>;
  return <span title={value}>{format(date, 'yyyy-MM-dd HH:mm')}</span>;
};

export default TimeDisplay;
