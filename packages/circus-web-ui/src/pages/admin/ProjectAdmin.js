import EditorPage from './EditorPage';
import React from 'react';
import * as et from 'rb/editor-types';
import WindowPresetEditor from './WindowPresetEditor';
import TagEditor, { newTagItem } from './TagEditor';
import AttributeSchemaArrayEditor from './AttributeSchemaEditor';
import LoadingIndicator from 'rb/LoadingIndicator';
import ProjectIcon from 'components/ProjectIcon';
import PropertyEditor from 'rb/PropertyEditor';
import ShrinkSelect from 'rb/ShrinkSelect';
import ColorPicker from 'rb/ColorPicker';


const windowPriorityOptions = [
	'dicom,preset,auto', 'dicom,auto',
	'preset,dicom,auto', 'preset,auto',
	'auto'
];

const listColumns = [
	{
		label: 'Project Name',
		data: p => <span>
			<ProjectIcon icon={p.icon} size='lg' />
			&ensp;
			{p.projectName}
		</span>
	},
	{ key: 'description', label: 'Description' },
	{ key: 'projectId', label: 'Project ID' }
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

const GlyphPicker = props => {
	const glyphs = [
		'stomach', 'brain', 'lung', 'liver', 'bone',
		'breast', 'heart', 'colon', 'face', 'abdomen',
		'joint', 'kidney', 'artery', 'pancreas',
		'calc', 'visualize', 'measure', 'cpu', 'scanner',
		'atom', 'person'
	];
	const options = {};
	glyphs.forEach(g => options[g] = { caption: <ProjectIcon
		icon={{ glyph: g, color: '#000000', backgroundColor: '#ffffff'}}
		size='lg'
	/>});
	return <ShrinkSelect options={options} {...props} />;
};

export default class ProjectAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = { ready: false };

		const iconProperties = [
			{ key: 'glyph', caption: 'Image', editor: GlyphPicker },
			{ key: 'color', caption: 'Color', editor: ColorPicker },
			{ key: 'backgroundColor', caption: 'Background', editor: ColorPicker },
		];

		this.editorProperties = [
			{ key: 'projectName', caption: 'Project Name', editor: et.text() },
			{ key: 'description', caption: 'Description', editor: et.text() },
			{
				key: 'icon',
				caption: 'Icon',
				editor: props => <PropertyEditor properties={iconProperties} {...props} />
			},
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
