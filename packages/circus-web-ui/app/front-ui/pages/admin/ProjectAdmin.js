import EditorPage from './EditorPage';
import React from 'react';
import * as et from 'rb/editor-types';

const editorProperties = [
	{ key: 'projectName', caption: 'Project Name', editor: et.text() },
	{ key: 'description', caption: 'Description', editor: et.text() }
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