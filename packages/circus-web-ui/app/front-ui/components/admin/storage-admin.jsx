import React from 'react';
import { EditorPage } from './editor-page';
import { api } from 'utils/api';
import { Button } from '../react-bootstrap';

export class StorageAdmin extends EditorPage {
	constructor(props) {
		super(props);
		this.title = 'Storage';
		this.glyph = 'save-file';
		this.endPoint = 'storage';
		this.primaryKey = 'storageID';
		this.editorProperties = [
			{
				key: 'storageID',
				caption: 'Storage ID',
				type: 'constant'
			},
			{
				key: 'type',
				caption: 'Storage Type',
				type: 'select',
				spec: { options: { dicom: 'DICOM Storage', label: 'Label Data' } }
			},
			{
				key: 'path',
				caption: 'Change Path',
				type: 'text'
			}
		];
		this.listColumns = [
			{ key: 'storageID', label: 'Storage ID' },
			{ key: 'type', label: 'Type' },
			{ key: 'path', label: 'Path' },
		];
	}

	makeEmptyItem() {
		return {
			groupName: '',
		};
	}

}
