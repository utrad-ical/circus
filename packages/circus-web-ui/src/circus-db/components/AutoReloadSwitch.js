import React, { Fragment } from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import Icon from './Icon';

const defaultOptions = {
  0: 'none',
  60000: 'every 1 min',
  180000: 'every 3 min',
  600000: 'every 10 min'
};

export default class AutoReloadSwitch extends React.Component {
  constructor(props) {
    super(props);
    this.resetTimer(props.interval);
    this.state = { interval: 0 };
  }

  resetTimer(interval) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (interval > 0) {
      this.timer = setInterval(this.handleTimer, interval);
    }
  }

  handleTimer = () => {
    const { onRefresh } = this.props;
    onRefresh();
  };

  handleIntervalChange = value => {
    this.setState({ interval: value });
    this.resetTimer(value);
  };

  render() {
    const { options = defaultOptions, onRefresh, ...rest } = this.props;
    const { interval } = this.state;
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
          onChange={this.handleIntervalChange}
        />
      </Fragment>
    );
  }
}
