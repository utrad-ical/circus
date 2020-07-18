import React from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import BodyPartIcon from './BodyPartIcon';
import Project from 'types/Project';

const ProjectSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  projects: { projectId: string; project: Project }[];
}> = props => {
  const options: { [key: string]: any } = {};
  props.projects.forEach(p => {
    options[p.projectId] = {
      caption: (
        <span>
          <BodyPartIcon icon={p.project.icon} />
          &ensp;
          <b>{p.project.projectName}</b>&ensp;
          <small>{p.project.description}</small>
        </span>
      )
    };
  });
  return <ShrinkSelect {...props} options={options} />;
};

export default ProjectSelector;
