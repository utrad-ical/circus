import React from 'react';
import { connect } from 'react-redux';
import IconDisplay from 'components/IconDisplay';

const ProjectDisplayView = props => {
  const { projectId, withName, withDescription, ...rest } = props;
  const project = props.user.accessibleProjects.find(
    p => p.projectId === projectId
  );
  if (!project) {
    throw new Error('Tried to render icon for an inaccessible project');
  }

  return (
    <IconDisplay
      toolTip={project.project.description}
      icon={project.project.icon}
      title={withName && project.project.projectName}
      description={withDescription && project.project.description}
      {...rest}
    />
  );
};

const ProjectDisplay = connect(state => {
  return { user: state.loginUser.data };
})(ProjectDisplayView);

export default ProjectDisplay;
