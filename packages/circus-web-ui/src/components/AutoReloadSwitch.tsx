import React, { Fragment, useState } from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import Icon from './Icon';
import useInterval from 'utils/useInterval';

const defaultOptions = {
  0: 'none',
  60000: 'every 1 min',
  180000: 'every 3 min',
  600000: 'every 10 min'
};

const AutoReloadSwitch: React.FC<{
  onRefresh: () => void;
  options: any;
  bsSize: any;
  bsStyle: string;
}> = props => {
  const { onRefresh, options = defaultOptions, children, ...rest } = props;

  const [interval, setInterval] = useState(0);
  useInterval(onRefresh, interval);

  const handleIntervalChange = (value: number) => {
    setInterval(value);
  };

  return (
    <Fragment>
      <a onClick={onRefresh}>
        <Icon bsStyle="link" icon="refresh" />
      </a>
      &ensp;
      <ShrinkSelect
        {...rest}
        options={options}
        numericalValue
        value={interval}
        onChange={handleIntervalChange}
      />
    </Fragment>
  );
};

export default AutoReloadSwitch;
