import React from 'react';
import { connect } from 'react-redux';
import PhysicalTag from './PhysicalTag';

const ProjectTagView = props => {
  const { projectId, tag, user } = props;
  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  const tagDef = project.project.tags.find(t => t.name === tag);
  const color = tagDef ? tagDef.color : '#ffffff';
  return <PhysicalTag color={color} name={tag} />;
};

const ProjectTag = connect(state => {
  return { user: state.loginUser.data };
})(ProjectTagView);

export default ProjectTag;
