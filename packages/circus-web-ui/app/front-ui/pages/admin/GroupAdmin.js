import EditorPage from './EditorPage';
import React from 'react';
import { api } from 'utils/api';

export default class GroupAdmin extends EditorPage {
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
				spec: { type: 'checkbox', options: ['a', 'b', 'c'] }
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
				data: item => item.privileges.map((priv, i) => {
					const style = priv === 'manageServer' ? 'danger' : 'primary';
					return <span key={i} className={`label label-${style}`}>
						{priv}
					</span>;
				})
			},
			{
				label: 'Accessible Series Domains',
				data: item => item.domains.map((d, i) => (
					<span key={i} className='label label-default'>{d}</span>
				))
			},
		];
	}

	targetName(item) {
		return item.groupName;
	}

	async componentDidMount() {
		const params = await api('server_param');
		const domains = params.domains;
		const privList = await api('group-privileges');
		const privileges = {};
		for (const p of privList) privileges[p.privilege] = p.caption;
		this.editorProperties[2].spec.options = domains;
		this.editorProperties[1].spec.options = privileges;
		super.componentDidMount();
	}

	makeEmptyItem() {
		return {
			groupName: '',
		};
	}

}
