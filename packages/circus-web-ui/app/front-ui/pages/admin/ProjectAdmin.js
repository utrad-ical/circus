import EditorPage from './EditorPage';
import React from 'react';
import { api } from 'utils/api';
import * as et from 'rb/editor-types';
import WindowPresetEditor from './WindowPresetEditor';
import TagEditor, { newTagItem } from './TagEditor';
import AttributeSchemaArrayEditor from './AttributeSchemaEditor';
import LoadingIndicator from 'rb/LoadingIndicator';


const windowPriorityOptions = [
	'dicom,preset,auto', 'dicom,auto',
	'preset,dicom,auto', 'preset,auto',
	'auto'
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

export default class ProjectAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = { ready: false };

		this.editorProperties = [
			{ key: 'projectName', caption: 'Project Name', editor: et.text() },
			{ key: 'description', caption: 'Description', editor: et.text() },
			{
				key: 'windowPresets',
				caption: 'Window Presets',
				editor: et.arrayOf(WindowPresetEditor, { label: '', level: 0, width: 0 })
			},
			{
				key: 'windowPriority',
				caption: 'Window Priority',
				editor: et.shrinkSelect(windowPriorityOptions)
			},
			{
				key: 'tags',
				caption: 'Tags',
				editor: et.arrayOf(TagEditor, newTagItem)
			},
			{
				key: 'caseAttributesSchema',
				caption: 'Case Attribute Schema',
				className: 'attribute-schema-prop',
				editor: AttributeSchemaArrayEditor
			},
			{
				key: 'labelAttributesSchema',
				caption: 'Label Attribute Schema',
				className: 'attribute-schema-prop',
				editor: AttributeSchemaArrayEditor
			},
			'Group Privileges',
			{ key: 'addSeriesGroups', caption: 'Add Series Groups', editor: null },
			{ key: 'moderateGroups', caption: 'Moderate Groups', editor: null },
			{ key: 'viewPersonalInfoGroups', caption: 'View Personal Info Groups', editor: null },
			{ key: 'readGroups', caption: 'Read Groups', editor: null },
			{ key: 'writeGroups', caption: 'Write Groups', editor: null }
		];
	}

	async componentDidMount() {
		const groups = await api('group');
		const groupIdMap = {};
		groups.forEach(g => groupIdMap[g.groupID] = g.groupName);
		const GroupsMultiSelect = et.multiSelect(groupIdMap, { numericalValue: true });
		this.editorProperties.forEach(property => {
			if (/Groups$/.test(property.key)) {
				property.editor = GroupsMultiSelect;
			}
		});
		this.setState({ ready: true });
	}

	render() {
		if (!this.state.ready) return <LoadingIndicator />;
		return <EditorPage
			title='Projects'
			icon='education'
			endPoint='project'
			primaryKey='projectID'
			editorProperties={this.editorProperties}
			listColumns={listColumns}
			makeEmptyItem={makeEmptyItem}
		/>;
	}
}
