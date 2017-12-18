import EditorPage from './EditorPage';
import React from 'react';
import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import MultiSelect from 'rb/MultiSelect';
import * as et from 'rb/editor-types';
import ProjectSelectorMultiple from 'components/ProjectSelectorMultiple';

const makeEmptyItem = () => {
	return {
		groupName: 'untitled group',
		privileges: [],
		domains: [],
		readProjects: [],
		writeProjects: [],
		addSeriesProjects: [],
		viewPersonalInfoProjects: [],
		moderateProjects: []
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
		this.editorProperties = [
			{ key: 'groupName', caption: 'Group Name', editor: et.text() }, // 0
			{ key: 'privileges', caption: 'Privileges', editor: null }, // 1
			{ key: 'domains', caption: 'Accessible Domains', editor: null }, // 2
			{ key: 'readProjects', caption: 'Readable Projects', editor: null }, // 3
			{ key: 'writeProjects', caption: 'Writable Projects', editor: null }, // 4
			{ key: 'addSeriesProjects', caption: 'Add Series Projects', editor: null }, // 5
			{ key: 'viewPersonalInfoProjects', caption: 'View Personal Info Projects', editor: null }, // 6
			{ key: 'moderateProjects', caption: 'Moderate Projects', editor: null } // 7
		];
	}

	async componentDidMount() {
		const domains = await api('admin/server-params/domains');
		const privList = await api('admin/global-privileges');
		const privileges = {};
		for (const p of privList) privileges[p.privilege] = p.caption;
		this.editorProperties[1].editor = et.multiSelect(privileges, { type: 'checkbox' });
		this.editorProperties[2].editor = et.multiSelect(domains, { type: 'checkbox' });

		const projects = (await api('admin/projects')).items;
		const projectOptions = projects.map(project => ({ projectId: project.projectId, project }));
		const projectSelect = props => <ProjectSelectorMultiple
			projects={projectOptions} {...props}
		/>;

		for (let i = 3; i <= 7; i++) this.editorProperties[i].editor = projectSelect;

		this.setState({ ready: true });
	}

	render() {
		if (!this.state.ready) return <LoadingIndicator />;
		return <EditorPage
			title='User Groups'
			icon='record'
			endPoint='admin/groups'
			primaryKey='groupId'
			editorProperties={this.editorProperties}
			listColumns={listColumns}
			makeEmptyItem={makeEmptyItem}
			targetName={item => item.groupName}
		/>;
	}

}
