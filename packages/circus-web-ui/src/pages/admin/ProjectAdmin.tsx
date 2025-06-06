import EditorPage from './EditorPage';
import React from 'react';
import * as et from '@smikitky/rb-components/lib/editor-types';
import WindowPresetEditor from './WindowPresetEditor';
import TagEditor, { newTagItem } from './TagEditor';
import AttributeSchemaEditor from './AttributeSchemaEditor';
import BodyPartIcon from 'components/BodyPartIcon';
import IconEditor from './IconEditor';
import { DataGridColumnDefinition } from 'components/DataGrid';

const windowPriorityOptions = [
  'dicom,preset,auto',
  'dicom,auto',
  'preset,dicom,auto',
  'preset,auto',
  'auto'
];

const listColumns: DataGridColumnDefinition[] = [
  {
    caption: 'Project Name',
    className: 'project-name',
    renderer: ({ value: project }) => (
      <span>
        <BodyPartIcon icon={project.icon} size="lg" />
        &ensp;
        {project.projectName}
      </span>
    )
  },
  { key: 'description', caption: 'Description' },
  { key: 'projectId', caption: 'Project ID' }
];

const makeEmptyItem = () => {
  return {
    projectName: 'untitled project',
    description: '',
    icon: { glyph: 'cpu', color: '#38761d', backgroundColor: '#ffffff' },
    windowPresets: [],
    windowPriority: 'dicom,preset,auto',
    tags: [],
    caseAttributesSchema: { type: 'object', properties: {}, required: [] },
    labelAttributesSchema: { type: 'object', properties: {}, required: [] }
  };
};

const editorProperties = [
  { key: 'projectName', caption: 'Project Name', editor: et.text() },
  { key: 'description', caption: 'Description', editor: et.text() },
  { key: 'icon', caption: 'Icon', editor: IconEditor },
  {
    key: 'windowPresets',
    caption: 'Window Presets',
    editor: et.arrayOf(WindowPresetEditor, {
      label: '',
      level: 0,
      width: 0
    })
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
    editor: AttributeSchemaEditor
  },
  {
    key: 'labelAttributesSchema',
    caption: 'Label Attribute Schema',
    className: 'attribute-schema-prop',
    editor: AttributeSchemaEditor
  }
];

const ProjectAdmin: React.FC<{}> = props => {
  return (
    <EditorPage
      title="Projects"
      icon="material-school"
      searchName="admin-project"
      resource={{ endPoint: 'admin/projects', primaryKey: 'projectId' }}
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
    />
  );
};

export default ProjectAdmin;
