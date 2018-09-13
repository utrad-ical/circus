import React from 'react';
import BodyPartIcon from './BodyPartIcon';
import { OverlayTrigger, Tooltip } from 'components/react-bootstrap';

const ProjectDisplay = props => {
  const { plugin, size, withName } = props;
  const toolTip = (
    <Tooltip placelemnt="top" id="plugin-display-tooltip">
      {plugin.description}
    </Tooltip>
  );
  return (
    <OverlayTrigger overlay={toolTip} placement="top">
      <span>
        <BodyPartIcon icon={plugin.icon} size={size} />
        {withName && (
          <span>
            &ensp;<b>
              {plugin.pluginName} v{plugin.pluginVersion}
            </b>
          </span>
        )}
      </span>
    </OverlayTrigger>
  );
};

export default ProjectDisplay;
