import { EditorPage } from './editor-page.jsx';

export class ProjectAdmin extends EditorPage {
	constructor(props) {
		super(props);
		this.title = 'Projects';
		this.glyph = 'education';
		this.endPoint = 'project';
		this.primaryKey = 'projectID';
		this.editorProperties = [
			{ key: 'projectName', caption: 'Project Name', type: 'text' },
			{ key: 'projectName', caption: 'Description', type: 'text' },
		];
		this.listColumns = [
			{ key: 'projectID', label: 'Project ID' },
			{ key: 'projectName', label: 'Project Name' },
			{ key: 'description', label: 'Description' },
		];
	}

	makeEmptyItem() {
		return {
			groupName: '',
		};
	}

}
