import React from 'react';
import BodyPartIcon, { CircusIconDefinition } from './BodyPartIcon';
import styled from 'styled-components';
import { OverlayTrigger, Tooltip } from 'components/react-bootstrap';

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

  if (toolTip) {
    const tip = (
      <Tooltip placelemnt="top" id="icon-display-tooltip">
        {toolTip}
      </Tooltip>
    );
    return (
      <OverlayTrigger overlay={tip} placement="top">
        {content}
      </OverlayTrigger>
    );
  } else {
    return content;
  }
};

export default IconDisplay;
