import React from 'react';
import moment from 'moment';

const TimeDisplay = props => {
  const { value } = props;
  const m = moment(value);
  return <span title={value}>{m.format('YYYY-MM-DD HH:mm')}</span>;
};

export default TimeDisplay;
