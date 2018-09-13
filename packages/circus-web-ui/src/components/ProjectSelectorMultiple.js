import React from 'react';
import MultiSelect from 'rb/MultiSelect';
import BodyPartIcon from './BodyPartIcon';

const Renderer = props => {
  const { renderAs, project } = props;
  return (
    <span>
      <BodyPartIcon icon={project.icon} />&ensp;
      <b>{project.projectName}</b>
      {renderAs === 'select' && <small>&ensp;{project.description}</small>}
    </span>
  );
};

const ProjectSelectorMultiple = props => {
  const options = {};
  props.projects.forEach(p => {
    options[p.projectId] = {
      caption: p.project.projecName,
      project: p.project
    };
  });
  return <MultiSelect {...props} options={options} renderer={Renderer} />;
};

export default ProjectSelectorMultiple;
