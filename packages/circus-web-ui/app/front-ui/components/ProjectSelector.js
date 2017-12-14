import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';

const ProjectSelector = props => {
	const options = {};
	props.projects.forEach(p => {
		options[p.projectId] = {
			caption: <span>
				<b>{p.project.projectName}</b>&ensp;
				<small>{p.project.description}</small>
			</span>
		};
	});
	return <ShrinkSelect
		options={options}
		value={props.value}
		onChange={props.onChange}
	/>;
};

export default ProjectSelector;