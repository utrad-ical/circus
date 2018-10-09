import React from 'react';
import { Button } from 'components/react-bootstrap';
import styled from 'styled-components';

const StyledDiv = styled.div`
  display: flex;
  justify-content: space-around;
`;

const SelectionFeedbackListener = props => {
  const { onChange, className, value, options } = props;

  const handleClick = ev => {
    if (typeof onChange !== 'function') return;
    const selected = ev.target.innerText;
    onChange(selected);
  };

  return (
    <StyledDiv className={className}>
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
    </StyledDiv>
  );
};

export default SelectionFeedbackListener;
