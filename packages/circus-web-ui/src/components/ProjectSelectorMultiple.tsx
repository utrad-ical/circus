import React from 'react';
import MultiSelect from '@smikitky/rb-components/lib/MultiSelect';
import BodyPartIcon from './BodyPartIcon';
import styled from 'styled-components';
import Project from 'types/Project';

const Renderer: React.FC<{
  renderAs: 'select' | 'list';
  project: Project;
}> = props => {
  const { renderAs = 'dropdown', project } = props;
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

const ProjectSelectorMultiple: React.FC<{
  projects: { projectId: string; project: Project }[];
}> = props => {
  const { projects } = props;
  const options: { [key: string]: any } = {};
  projects.forEach(p => {
    options[p.projectId] = {
      caption: p.project.projectName,
      project: p.project
    };
  });
  return <StyledMultiSelect {...props} options={options} renderer={Renderer} />;
};

export default ProjectSelectorMultiple;
