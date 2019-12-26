import React from 'react';
import MultiSelect from 'rb/MultiSelect';
import BodyPartIcon from './BodyPartIcon';
import styled from 'styled-components';

const Renderer = props => {
  const { renderAs, project } = props;
  return (
    <span>
      <BodyPartIcon icon={project.icon} />
      &ensp;
      <b>{project.projectName}</b>
      {renderAs === 'select' && <small>&ensp;{project.description}</small>}
    </span>
  );
};

const StyledMultiSelect = styled(MultiSelect)`
  ul {
    white-space: nowrap;
    max-width: 400px;
    overflow: hidden;
  }
`;

const ProjectSelectorMultiple = props => {
  const { projects } = props;
  const options = {};
  projects.forEach(p => {
    options[p.projectId] = {
      caption: p.project.projecName,
      project: p.project
    };
  });
  return <StyledMultiSelect {...props} options={options} renderer={Renderer} />;
};

export default ProjectSelectorMultiple;
