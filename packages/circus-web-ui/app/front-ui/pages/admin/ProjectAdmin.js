import EditorPage from './EditorPage';
import React from 'react';
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
	{ key: 'projectId', label: 'Project ID' },
	{ key: 'projectName', label: 'Project Name' },
	{ key: 'description', label: 'Description' },
];

const makeEmptyItem = () => {
	return {
		projectName: 'untitled project',
		description: '',
		windowPresets: [],
		windowPriority: 'dicom,preset,auto',
		tags: [],
		caseAttributesSchema: [],
		labelAttributesSchema: []
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
		];
	}

	async componentDidMount() {
		this.setState({ ready: true });
	}

	render() {
		if (!this.state.ready) return <LoadingIndicator />;
		return <EditorPage
			title='Projects'
			icon='education'
			endPoint='admin/projects'
			primaryKey='projectId'
			editorProperties={this.editorProperties}
			listColumns={listColumns}
			makeEmptyItem={makeEmptyItem}
		/>;
	}
}
