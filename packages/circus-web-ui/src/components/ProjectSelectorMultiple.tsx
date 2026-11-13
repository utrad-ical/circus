import React from 'react';
import MultiSelect from '#components/MultiSelect.tsx';
import BodyPartIcon from './BodyPartIcon.tsx';
import type Project from '#types/Project.ts';
import styles from './ProjectSelectorMultiple.module.css';

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

const ProjectSelectorMultiple: React.FC<{
  projects: { projectId: string; project: Project }[];
  noneText?: string;
  value: string[];
  onChange: (value: string[]) => void;
}> = props => {
  const { projects, ...rest } = props;
  const options: { [key: string]: any } = {};
  projects.forEach(p => {
    options[p.projectId] = {
      caption: p.project.projectName,
      project: p.project
    };
  });
  return (
    <MultiSelect
      {...rest}
      className={styles.projectSelectorMultiple}
      options={options}
      renderer={Renderer}
    />
  );
};

export default ProjectSelectorMultiple;
