import React from 'react';
import Icon from './Icon';
import classnames from 'classnames';
import styled from 'styled-components';

export interface CircusIconDefinition {
  glyph: string;
  color: string;
  backgroundColor: string;
}

const StyledSpan = styled.span`
  border-radius: 5px;
  vertical-align: middle;
  font-size: 90%;
  padding: 3px;
  &.lg {
    font-size: 150%;
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
