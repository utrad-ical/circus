import React from 'react';
import EditorPage from './EditorPage';
import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import ShrinkSelect from 'rb/ShrinkSelect';
import MultiSelect from 'rb/MultiSelect';
import * as et from 'rb/editor-types';

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
			{ caption: 'User Email', key: 'userEmail', editor: et.text() },
			{ caption: 'Login Name', key: 'loginID', editor: et.text() },
			{ caption: 'Description', key: 'description', editor: et.text() },
			{ caption: 'Password', key: 'password', editor: et.password() },
			{ caption: 'Groups', key: 'groups', editor: null },
			{
				caption: 'Theme',
				key: 'preferences.theme',
				editor: et.shrinkSelect({ mode_white: 'White', mode_black: 'Black' })
			},
			{ caption: 'Show personal info', key: 'preferences.personalInfoView', editor: et.checkbox({ label: 'show' }) },
			{caption: 'Login Enabled', key: 'loginEnabled', editor: et.checkbox({ label: 'enabled' }) }
		];
	}

	async componentDidMount() {
		const groups = await api('group');
		const groupIdMap = {};
		groups.forEach(g => groupIdMap[g.groupID] = g.groupName);
		this.editorProperties[4].editor = props => <MultiSelect
			options={groupIdMap} numericalValue {...props}
		/>;
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

