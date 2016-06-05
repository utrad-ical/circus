import { EditorPage } from './editor-page';
import React from 'react';
import { Button } from 'components/react-bootstrap';
import { api } from 'utils/api';

export class GroupAdmin extends EditorPage {
	constructor(props) {
		super(props);
		this.state.domains = [];
		this.title = 'User Groups';
		this.glyph = 'record';
		this.endPoint = 'group';
		this.primaryKey = 'groupID';
		this.editorProperties = [
			{ key: 'groupName', caption: 'Group Name', type: 'text' },
			{
				key: 'privileges',
				caption: 'Privileges',
				type: 'multiselect',
				spec: { options: ['a', 'b', 'c'] }
			},
			{
				key: 'domains',
				caption: 'Accessible Domains',
				type: 'multiselect',
				spec: { options: this.state.domains }
			}
		];
		this.listColumns = [
			{ key: 'groupName', label: 'Group Name' },
			{
				label: 'Privileges',
				data: item => {
					return item.privileges.map(priv => {
						return [<span className="label label-primary">
							{priv}
						</span>, ' '];
					});
				},
			},
			{ key: 'domains', label: 'Accessible Series Domains' },
		];
	}

	async componentDidMount() {
		const params = await api('server_param');
		const domains = params.domains;
		this.editorProperties[2].spec.options = domains;
		super.componentDidMount();
	}

	makeEmptyItem() {
		return {
			groupName: '',
		};
	}

}
