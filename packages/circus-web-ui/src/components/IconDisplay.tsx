import React from 'react';
import type { CircusIconDefinition } from './BodyPartIcon.tsx';
import BodyPartIcon from './BodyPartIcon.tsx';
import styled from 'styled-components';
import Tooltip from './Tooltip.tsx';

const StyledSpan = styled.span`
  display: inline-block;
  .name {
    display: inline-block;
    vertical-align: middle;
    margin-left: 5px;
  }
  .title {
    font-weight: bolder;
  }
  .description {
    font-size: 90%;
  }
`;

const IconDisplay: React.FC<{
  size?: string;
  icon: CircusIconDefinition;
  title: React.ReactNode;
  description?: React.ReactNode;
  toolTip?: React.ReactChild;
}> = props => {
  const { size, icon, title, description, toolTip } = props;

  const content = (
    <StyledSpan className="icon-display">
      <BodyPartIcon icon={icon} size={size} />
      <div className="name">
        {title && <div className="title">{title}</div>}
        {description && <div className="description"> {description}</div>}
      </div>
    </StyledSpan>
  );

  return toolTip ? <Tooltip content={toolTip}>{content}</Tooltip> : content;
};

export default IconDisplay;
