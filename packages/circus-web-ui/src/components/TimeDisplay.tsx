import React from 'react';
import moment from 'moment';

const TimeDisplay: React.FC<{
  /**
   * ISO Time string.
   */
  value: string;
  invalidLabel?: string;
}> = props => {
  const { value, invalidLabel = '' } = props;
  const m = moment(value);
  if (!m.isValid()) return <span>{invalidLabel}</span>;
  return <span title={value}>{m.format('YYYY-MM-DD HH:mm')}</span>;
};

export default TimeDisplay;
