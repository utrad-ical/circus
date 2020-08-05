import React from 'react';
import BodyPartIcon, { CircusIconDefinition } from './BodyPartIcon';
import styled from 'styled-components';
import { OverlayTrigger, Tooltip } from 'components/react-bootstrap';

const StyledSpan = styled.span`
  display: inline-block;
`;

const IconDisplay: React.FC<{
  size?: string;
  icon: CircusIconDefinition;
  title: React.ReactNode;
  description?: React.ReactNode;
  toolTip: any;
}> = props => {
  const { size, icon, title, description, toolTip } = props;

  const content = (
    <StyledSpan>
      <BodyPartIcon icon={icon} size={size} />
      {title && (
        <span>
          &ensp;<b>{title}</b>
        </span>
      )}
      {description && (
        <span>
          &ensp;<small>{description}</small>
        </span>
      )}
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
