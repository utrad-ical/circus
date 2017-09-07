import React from 'react';
import EditorPage from './EditorPage';
import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';

const makeEmptyItem = () => {
	return {
		userEmail: '',
		loginID: '',
		description: '',
		password: '',
		groups: [],
		'preferences.theme': 'mode_white',
		'preferences.personalInfoView': true,
		loginEnabled: true
	};
};

export default class UserAdmin extends React.Component {
	constructor(props) {
		super(props);

		this.state = { ready: false };

		this.listColumns = 	[
			{ key: 'userEmail', label: 'User ID (E-mail)' },
			{ key: 'loginID', label: 'Login Name' },
			{ key: 'description', label: 'Description' },
			{
				data: item => {
					return item.groups.map(groupID => {
						if (!this.groupIdMap) return null;
						return <span className='label label-default' key={groupID}>
							{this.groupIdMap[groupID]}
						</span>;
					});
				},
				label: 'Groups'
			}
		];

		this.editorProperties = [
			{ caption: 'User Email', key: 'userEmail', type: 'text' },
			{ caption: 'Login Name', key: 'loginID', type: 'text' },
			{ caption: 'Description', key: 'description', type: 'text' },
			{ caption: 'Password', key: 'password', type: 'password' },
			{
				caption: 'Groups',
				key: 'groups',
				type: 'multiselect',
				spec: { options: [], numericalValue: true }
			},
			{
				caption: 'Theme',
				key: 'preferences.theme',
				type: 'select',
				spec: { options: { mode_white: 'White', mode_black: 'Black' } }
			},
			{ caption: 'Show personal info', key: 'preferences.personalInfoView', type: 'checkbox' },
			{caption: 'Login Enabled', key: 'loginEnabled', type: 'checkbox'}
		];
	}

	async componentDidMount() {
		const groups = await api('group');
		const groupIdMap = {};
		groups.forEach(g => groupIdMap[g.groupID] = g.groupName);
		this.editorProperties[4].spec.options = groupIdMap;
		this.groupIdMap = groupIdMap;
		this.setState({ ready: true });
	}

	render() {
		if (!this.state.ready) return <LoadingIndicator />;
		return <EditorPage
			title='Users'
			icon='user'
			endPoint='user'
			primaryKey='userEmail'
			editorProperties={this.editorProperties}
			listColumns={this.listColumns}
			makeEmptyItem={makeEmptyItem}
		/>;
	}
}

