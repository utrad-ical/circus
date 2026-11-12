import React from 'react';
import Icon from './Icon.tsx';
import classnames from 'classnames';
import styled from 'styled-components';

export interface CircusIconDefinition {
  glyph: string;
  color: string;
  backgroundColor: string;
}

const StyledSpan = styled.span`
  display: inline-flex;
  border-radius: 5px;
  vertical-align: middle;
  font-size: 90%;
  padding: 3px;
  > svg {
    font-size: 1em;
    vertical-align: 0;
  }
  &.lg {
    font-size: 175%;
  }
  &.xl {
    font-size: 200%;
  }
`;

/**
 * Renderes a body-part icon with the specified color and backgroundColor.
 */
const BodyPartIcon: React.FC<{
  size?: string;
  icon: CircusIconDefinition;
}> = props => {
  const {
    size,
    icon: { glyph, color, backgroundColor }
  } = props;
  const style = { color, backgroundColor };
  return (
    <StyledSpan className={classnames(size)} style={style}>
      <Icon icon={`circus-b-${glyph}`} />
    </StyledSpan>
  );
};

export default BodyPartIcon;
