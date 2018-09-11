import React from 'react';
import classnames from 'classnames';
import { Button, ButtonGroup } from 'components/react-bootstrap';

const SelectionFeedbackListener = props => {
  const { onChange, className, value, options } = props;

  const handleClick = ev => {
    if (typeof onChange !== 'function') return;
    const selected = ev.target.innerText;
    onChange(selected);
  };

  return (
    <ButtonGroup
      className={classnames(className, 'selection-feedback-listener')}
    >
      {options.map((o, i) => (
        <Button
          key={i}
          bsStyle={o === value ? 'primary' : 'default'}
          active={o === value}
          onClick={handleClick}
        >
          {o}
        </Button>
      ))}
    </ButtonGroup>
  );
};

export default SelectionFeedbackListener;
