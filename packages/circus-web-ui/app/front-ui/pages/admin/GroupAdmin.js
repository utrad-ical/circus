import EditorPage from './EditorPage';
import React from 'react';
import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';

const makeEmptyItem = () => {
	return {
		groupName: '',
	};
};

const listColumns = [
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

export default class GroupAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = { ready: false };
		this.domains = [];
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
				spec: { options: this.domains }
			}
		];
	}

	async componentDidMount() {
		const params = await api('server_param');
		this.domains = params.domains;
		const privList = await api('group-privileges');
		const privileges = {};
		for (const p of privList) privileges[p.privilege] = p.caption;
		this.editorProperties[1].spec.options = privileges;
		this.editorProperties[2].spec.options = this.domains;
		this.setState({ ready: true });
	}

	render() {
		if (!this.state.ready) return <LoadingIndicator />;
		return <EditorPage
			title='User Groups'
			icon='record'
			endPoint='group'
			primaryKey='groupID'
			editorProperties={this.editorProperties}
			listColumns={listColumns}
			makeEmptyItem={makeEmptyItem}
			targetName={item => item.groupName}
		/>;
	}

}
