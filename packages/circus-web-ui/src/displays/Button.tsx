import classNames from 'classnames';
import React, { forwardRef } from 'react';
import styled from 'styled-components';
import buttonIcons from './buttonIcons.ts';

type Size = 'sm' | 'lg' | 'xs';

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
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
}> = forwardRef((props, ref) => {
  const {
    color,
    icon,
    size,
    className,
    selected,
    disabled,
    style,
    onClick,
    children
  } = props;

  const iconSvg = icon ? buttonIcons[icon] : undefined;
  return (
    <StyledButton
      ref={ref}
      color={color}
      size={size}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={classNames(className, { selected })}
    >
      {iconSvg && <IconSpan dangerouslySetInnerHTML={{ __html: iconSvg }} />}
      {children}
    </StyledButton>
  );
});

const paddings: { [size: string]: string } = {
  xs: '1px 3px',
  sm: '5px 5px',
  default: '6px 7px'
};

const fontSizes: { [size: string]: string } = {
  xs: '12px',
  sm: '12px',
  default: 'inherit'
};

const StyledButton = styled.button`
  padding: ${(props: any) => paddings[props.size] ?? paddings.default};
  border: 1px solid gray;
  background-color: var(--circus-background, 'transparent');
  color: ${(props: any) => props.color ?? 'var(--circus-background-text)'};
  font-size: ${(props: any) => fontSizes[props.size] ?? fontSizes.default};
  vertical-align: middle;
  &.selected {
    background-color: ${(props: any) =>
      props.color ?? 'var(--circus-brand-primary)'};
    color: var(--circus-background, 'white');
  }
  &:hover {
    filter: brightness(80%);
  }
  &:disabled {
    filter: none;
    opacity: 0.5;
  }
`;

const IconSpan = styled.span`
  svg {
    width: 1em;
    height: 1em;
    fill: currentColor;
    vertical-align: -0.125em;
  }
`;
