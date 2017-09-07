import EditorPage from './EditorPage';
import React from 'react';

const editorProperties = [
	{ key: 'projectName', caption: 'Project Name', type: 'text' },
	{ key: 'description', caption: 'Description', type: 'text' },
];

const listColumns = [
	{ key: 'projectID', label: 'Project ID' },
	{ key: 'projectName', label: 'Project Name' },
	{ key: 'description', label: 'Description' },
];

const makeEmptyItem = () => {
	return {
		groupName: '',
	};
};

const ProjectAdmin = () => {
	return <EditorPage
		title='Projects'
		icon='education'
		endPoint='project'
		primaryKey='projectID'
		editorProperties={editorProperties}
		listColumns={listColumns}
		makeEmptyItem={makeEmptyItem}
	/>;
};

export default ProjectAdmin;