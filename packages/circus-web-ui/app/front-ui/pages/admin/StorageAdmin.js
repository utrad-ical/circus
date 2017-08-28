import React from 'react';
import { EditorPage } from './EditorPage';
import { api } from 'utils/api';
import { Button, Glyphicon } from 'components/react-bootstrap';
import { confirm } from 'components/modal';

export default class StorageAdmin extends EditorPage {
	async setActiveClick(id) {
		const args = {
			method: 'put',
			data: {},
		};
		await api('storage/setactive/' + id, args);
		this.setState({ target: null, editing: null });
		this.loadItems();
	}

	constructor(props) {
		super(props);
		this.title = 'Storage';
		this.glyph = 'save-file';
		this.endPoint = 'storage';
		this.primaryKey = 'storageID';
		this.editorProperties = [
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
			{
				label: '',
				data: item => {
					if (item.active) return <span className='text-success'>
						<Glyphicon glyph='off' />
						Active
					</span>;
					return (
						<Button bsStyle='default' bsSize='xs'
							onClick={this.setActiveClick.bind(this, item.storageID)}
						>
							Set this as active
						</Button>
					);
				}
			}
		];
	}

	async preCommitHook() {
		return await confirm('Do you really want to update the existing path/type?');
	}

	makeEmptyItem() {
		return {
			groupName: '',
		};
	}

	editorFooter() {
		return <div className='text-warning'>
			<strong>Warning:</strong> Changing the path and type
				may cause unexpected results.
		</div>;
	}
}
