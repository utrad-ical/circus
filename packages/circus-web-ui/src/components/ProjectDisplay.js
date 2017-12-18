import React from 'react';
import { connect } from 'react-redux';
import ProjectIcon from 'components/ProjectIcon';

const ProjectDisplayView = props => {
	const { projectId, size, withName, withDescription } = props;
	const project = props.user.accessibleProjects.find(
		p => p.projectId === projectId
	);
	if (!project) {
		throw new Error('Tried to render icon for an inaccessible project');
	}
	return (
		<span>
			<ProjectIcon icon={project.project.icon} size={size} />
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
	);
};

const ProjectDisplay = connect(state => {
	return { user: state.loginUser.data };
})(ProjectDisplayView);

export default ProjectDisplay;
