import classNames from 'classnames';
import React, { forwardRef } from 'react';
import styled from 'styled-components';

/**
 * This is a styled button that renders according to the CIRCUS theme.
 * You can optionally pass a background color.
 */
export const Button: React.FC<{
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
}> = forwardRef((props, ref) => {
  const { color, selected, disabled, onClick, children } = props;
  return (
    <StyledButton
      ref={ref}
      color={color}
      onClick={onClick}
      disabled={disabled}
      className={classNames({ selected })}
    >
      {children}
    </StyledButton>
  );
});

const StyledButton = styled.button`
  padding: 5px;
  border: 1px solid gray;
  background-color: ${(props: any) => props.theme.background ?? 'transparent'};
  color: ${(props: any) => props.color ?? props.theme.textColor};
  &.selected {
    background-color: ${(props: any) =>
      props.color ?? props.theme.brandPrimary};
    color: ${(props: any) => props.theme.background ?? 'white'};
  }
  &:hover {
    filter: brightness(80%);
  }
  &:disabled {
    opacity: 0.5;
  }
  .opinions {
    border: 1px solid gray;
    border-radius: 5px;
    font-size: 80%;
    margin-right: 3px;
  }
`;
