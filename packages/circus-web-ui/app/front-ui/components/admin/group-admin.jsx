import { EditorPage } from './editor-page';

export class GroupAdmin extends EditorPage {
	constructor(props) {
		super(props);
		this.title = 'User Groups';
		this.glyph = 'record';
		this.endPoint = 'group';
		this.primaryKey = 'groupID';
		this.editorProperties = [
			{ key: 'groupName', caption: 'Group Name', type: 'text' }
		];
		this.listColumns = [
			{ key: 'groupName', label: 'Group Name' },
			{ key: 'privileges', label: 'Privileges' },
			{ key: 'domains', label: 'Accessible Series Domains' },
		];
	}

	makeEmptyItem() {
		return {
			groupName: '',
		};
	}

}
