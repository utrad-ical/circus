import classNames from 'classnames';
import React, { forwardRef } from 'react';
import styled from 'styled-components';

type Size = 'sm' | 'lg' | 'xs';

const iconPrefixMap: { [prefix: string]: string } = {
  'glyphicon-': 'glyphicon glyphicon-',
  'circus-': 'circus-icon circus-icon-',
  'rs-': 'rs-icon-',
  default: 'glyphicon glyphicon-'
};

/**
 * This is a styled button that renders according to the CIRCUS theme.
 * You can optionally pass a background color and an icon.
 */
export const Button: React.FC<{
  color?: string;
  icon?: string;
  size?: Size;
  className?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
}> = forwardRef((props, ref) => {
  const {
    color,
    icon,
    size,
    className,
    selected,
    disabled,
    onClick,
    children
  } = props;

  const matchedPrefix =
    Object.keys(iconPrefixMap).find(p => icon?.startsWith(p)) ?? 'default';
  const iconClass = icon
    ? iconPrefixMap[matchedPrefix] + icon.replace(matchedPrefix, '')
    : undefined;

  return (
    <StyledButton
      ref={ref}
      color={color}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={classNames(className, { selected })}
    >
      {icon && <span className={iconClass} />}
      {children}
    </StyledButton>
  );
});

const paddings: { [size: string]: string } = {
  xs: '1px 5px',
  sm: '5px 10px',
  default: '6px 12px'
};

const fontSizes: { [size: string]: string } = {
  xs: '12px',
  sm: '12px',
  default: 'inherit'
};

const StyledButton = styled.button`
  padding: ${(props: any) => paddings[props.size] ?? paddings.default};
  border: 1px solid gray;
  background-color: ${(props: any) => props.theme.background ?? 'transparent'};
  color: ${(props: any) => props.color ?? props.theme.textColor};
  font-size: ${(props: any) => fontSizes[props.size] ?? fontSizes.default};
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
`;
