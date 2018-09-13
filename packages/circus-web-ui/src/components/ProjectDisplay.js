import React from 'react';
import { connect } from 'react-redux';
import BodyPartIcon from './BodyPartIcon';
import { OverlayTrigger, Tooltip } from 'components/react-bootstrap';

const ProjectDisplayView = props => {
  const { projectId, size, withName, withDescription } = props;
  const project = props.user.accessibleProjects.find(
    p => p.projectId === projectId
  );
  if (!project) {
    throw new Error('Tried to render icon for an inaccessible project');
  }
  const toolTip = (
    <Tooltip placelemnt="top" id="project-display-tooltip">
      {project.project.description}
    </Tooltip>
  );
  return (
    <OverlayTrigger overlay={toolTip} placement="top">
      <span>
        <BodyPartIcon icon={project.project.icon} size={size} />
        {withName && (
          <span>
            &ensp;<b>{project.project.projectName}</b>
          </span>
        )}
        {withDescription && (
          <span>
            &ensp;<small>{project.project.description}</small>
          </span>
        )}
      </span>
    </OverlayTrigger>
  );
};

const ProjectDisplay = connect(state => {
  return { user: state.loginUser.data };
})(ProjectDisplayView);

export default ProjectDisplay;
