import React from 'react';
import classnames from 'classnames';
import styled, { keyframes, css } from 'styled-components';

const sizeMap = {
  xs: '0.75em',
  sm: '0.875em',
  md: '1em',
  lg: '1.5em',
  xl: '2em',
  xxl: '6em'
};

type IconSize = keyof typeof sizeMap;

const baseStyle = css`
  display: inline-block;
  vertical-align: middle;
  line-height: 1;
  font-size: 1.2em;
  &.text-link {
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(359.9deg);
  }
`;

const StyledI = styled.i<{ size?: IconSize }>`
  ${baseStyle}
  font-size: ${(props: { size?: IconSize }) => sizeMap[props.size ?? 'md']};
  &.spin {
    animation: ${spin} 2s infinite linear;
  }
`;

const StyledSpan = styled.span<{ size?: IconSize }>`
  ${baseStyle}
  font-family: 'Material Symbols Outlined';
  user-select: none;
  font-size: ${(props: { size?: IconSize }) => sizeMap[props.size ?? 'md']};
  &.spin {
    animation: ${spin} 2s infinite linear;
  }
`;

export const createIconComponent = (prefixes: { [key: string]: string }) => {
  const Icon: React.FC<{
    icon: string;
    size?: keyof typeof sizeMap;
    className?: string;
    spin?: boolean;
  }> = function Icon({ icon, size = 'md', className, spin = false }) {
    for (const k of Object.keys(prefixes)) {
      if (icon.indexOf(k) === 0) {
        const name = icon.substring(k.length);
        if (k === 'material-') {
          return (
            <StyledSpan
              className={classnames(className, { spin })}
              aria-hidden="true"
              size={size}
            >
              {name}
            </StyledSpan>
          );
        }
        return (
          <StyledI
            className={classnames(className, { spin }, prefixes[k] + name)}
            size={size}
          />
        );
      }
    }
    // fallback
    return (
      <StyledI
        className={classnames(className, { spin }, prefixes.default + icon)}
        size={size}
      />
    );
    // return (
    //   <StyledSpan className={classnames({ spin })} aria-hidden="true">
    //     {icon}
    //   </StyledSpan>
    // );
  };
  return Icon;
};

const Icon: React.FC<any> = createIconComponent({
  'glyphicon-': 'glyphicon glyphicon-',
  'material-': '',
  'circus-': 'circus-icon circus-icon-',
  'rs-': 'rs-icon-',
  // Fallback to Material Symbols when no prefix matches
  // default: '',
  default: 'glyphicon glyphicon-'
});

export default Icon;
