import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import BodyPartIcon from './BodyPartIcon';

const ProjectSelector = props => {
  const options = {};
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
