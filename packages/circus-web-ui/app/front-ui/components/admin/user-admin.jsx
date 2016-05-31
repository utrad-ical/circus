import React from 'react';
import { EditorPage } from './editor-page.jsx';
import { api } from '../../utils/api';
import { Button } from '../react-bootstrap';

export class UserAdmin extends EditorPage {
	constructor(props) {
		super(props);
		this.title = 'Users';
		this.glyph = 'user';
		this.endPoint = 'user';
		this.primaryKey = 'userEmail';
		this.editorProperties = [
			{ caption: 'User Email', key: 'userEmail', type: 'text' },
			{ caption: 'Login Name', key: 'loginID', type: 'text' },
			{ caption: 'Description', key: 'description', type: 'text' },
			{ caption: 'Password', key: 'password', type: 'password' },
			// {
			// 	caption: 'Groups',
			// 	key: 'groups',
			// 	type: 'multiselect',
			// 	spec: { options: groups, valueType: 'number' }
			// },
			{
				caption: 'Theme',
				key: 'preferences.theme',
				type: 'select',
				spec: { options: [ 'mode_white', 'mode_black' ] }
			},
			// {caption: 'Show personal info', key: 'preferences.personalInfoView', type: 'checkbox'},
			// {caption: 'Login Enabled', key: 'loginEnabled', type: 'checkbox'}
		];
		this.listColumns = [
			{ key: 'userEmail', label: 'User ID (E-mail)' },
			{ key: 'loginID', label: 'Login Name' },
			{ key: 'description', label: 'Description' },
			{
				data: item => {
					return item.groups.map(groupID => {
						if (!this.state.groupIdMap) return null;
						return <Button bsSize="xs">
							{this.state.groupIdMap[groupID]}
						</Button>;
					});
				},
				label: 'Groups'
			}
		];
	}

	async componentDidMount() {
		const groups = await api('group');
		const groupIdMap = {};
		groups.forEach(g => groupIdMap[g.groupID] = g.groupName);
		this.setState({ groupIdMap });
		super.componentDidMount();
	}
}
