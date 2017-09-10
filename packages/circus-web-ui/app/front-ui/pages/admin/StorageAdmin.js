import React from 'react';
import EditorPage from './EditorPage';
import { api } from 'utils/api';
import { Button, Glyphicon } from 'components/react-bootstrap';
import { confirm } from 'rb/modal';
import LoadingIndicator from 'rb/LoadingIndicator';
import ShrinkSelect from 'rb/ShrinkSelect';
import * as et from 'rb/editor-types';

const makeEmptyItem = () => {
	return {
		groupName: '',
	};
};

const editorProperties = [
	{
		key: 'type',
		caption: 'Storage Type',
		editor: props => <ShrinkSelect
			options={{ dicom: 'DICOM Storage', label: 'Label Data' }}
			{...props}
		/>
	},
	{
		key: 'path',
		caption: 'Change Path',
		editor: et.text()
	}
];

async function preCommitHook(target) {
	if (target === null) return true;
	return await confirm('Do you really want to update the existing path/type?');
}

export default class StorageAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = { ready: true };
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
							onClick={() => this.handleActiveClick(item.storageID)}
						>
							Set this as active
						</Button>
					);
				}
			}
		];

	}

	async handleActiveClick(id) {
		// unmount the editor so that it re-renders after this
		this.setState({ ready: false });

		const args = {
			method: 'put',
			data: {},
		};
		await api('storage/setactive/' + id, args);

		// re-mount the editor
		this.setState({ ready: true });
	}

	render() {
		if (!this.state.ready) return <LoadingIndicator />;
		return <div>
			<EditorPage
				title='Storage'
				icon='save-file'
				endPoint='storage'
				primaryKey='storageID'
				editorProperties={editorProperties}
				listColumns={this.listColumns}
				makeEmptyItem={makeEmptyItem}
				preCommitHook={preCommitHook}
			/>
			<div className='text-warning'>
				<strong>Warning:</strong> Changing the path and type
					may cause unexpected results.
			</div>
		</div>;
	}
}
