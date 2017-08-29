import React from 'react';
import { Button, ButtonToolbar, Glyphicon, Well, ProgressBar } from './react-bootstrap';
import { FileDroppable } from './file-droppable';
import { showMessage } from 'actions';
import * as modal from 'rb/Modal';
import * as axios from 'axios';

/**
 * Styled div where a user can upload one ore more files.
 * Upload progress is displayed using a progress bar,
 * and the response can be accessed via a Promise instance.
 */
export class FileUpload extends React.Component {
	constructor(props) {
		super(props);
		this.state = { filesSelected: [], uploading: false, progress: 0 };
	}

	dropFile(files) {
		this.setState({ filesSelected: files });
	}

	fileSelected() {
		// console.log(this.refs.fileInput.files);
		this.setState({ filesSelected: this.refs.fileInput.files });
	}

	uploadProgress(event) {
		const bytesSent = event.loaded;
		const bytesTotal = event.total;
		this.setState({ progress: Math.floor(bytesSent * 100 / bytesTotal) });
	}

	async upload() {
		const files = this.state.filesSelected;
		const num = files.length;
		if (typeof num !== 'number' || num <= 0) return;

		const fd = new FormData();
		let size = 0;

		for (let i = 0; i < num; i++) {
			fd.append('files[]', files[i]);
			size += files[i].size;
		}

		const prompt = num >= 2 ? `these ${num} files?` : 'this file?';
		const uploadFileMax = this.props.uploadFileMax;
		if (num > uploadFileMax) {
			modal.alert(
				'Sorry, you can not upload more than ' + uploadFileMax +
				' files at the same time.\n' +
				'Use a zipped file, or consult the server administrator ' +
				'if they can modify the current limitation.');
			return;
		}
		if (!(await modal.confirm(`Do you want to upload ${prompt} (${size} bytes)`))) {
			return;
		}

		// Allow the component user to access the FormData and modify it
		if (typeof this.props.onBeforeUpload === 'function') {
			this.props.onBeforeUpload(fd);
		}

		const req = axios.post(this.props.url, {
			data: fd,
			progress: this.uploadProgress.bind(this)
		});

		try {
			this.setState({ uploading: true });
			const res = await req;
			this.setState({ uploading: false });

			if (typeof this.props.onUpload === 'function') {
				this.props.onUpload(res);
			}
		} catch (err) {
			this.setState({ uploading: false });
			showMessage(`Upload failed (Error ${err.status})`, 'danger');
			// console.log(err);
			throw err;
		}

		// busy(true);
		// $.ajax({
		// 	url: $('#form').attr('action'),
		// 	type: "POST",
		// 	data: fd,
		// 	method:"POST",
		// 	processData: false,
		// 	contentType: false,
		// 	dataType: 'json',
		// 	xhr: myXhr,
		// 	success: function (data) {
		// 		$('#task-watcher').taskWatcher(data.taskID).on('finish', function() {
		// 			form.reset();
		// 			busy(false);
		// 		});
		// 	},
		// 	complete: function (data) {
		// 		var res = JSON.parse(data.responseText);
		// 		if (!res.taskID) {
		// 			busy(false);
		// 		}
		// 		if (res.errors) {
		// 			showMessage(res.errors, true);
		// 		}
		// 	}
		// });
	}

	render() {
		return <FileDroppable onDropFile={this.dropFile.bind(this)}>
			<Well className='file-upload'>
				{this.props.children}
				<div>
					<input
						ref='fileInput'
						type='file'
						multiple={!!this.props.multiple}
						onChange={this.fileSelected.bind(this)}
					/>
					{ this.state.filesSelected.length == 0 ?
						<Button bsStyle='default'
							onClick={() => this.refs.fileInput.click()}
						>
							<Glyphicon glyph='plus' />&ensp;Select File
						</Button>
						:
						<ButtonToolbar>
							<Button bsStyle='primary'
								disabled={this.state.filesSelected.length < 1}
								onClick={this.upload.bind(this)}
							>
								<Glyphicon glyph='upload' />&ensp;Upload
							</Button>
							<Button bsStyle='link'
								onClick={() => this.setState({ filesSelected: [] })}
							>
								Reset
							</Button>
						</ButtonToolbar>
					}
				</div>
				{ this.state.uploading ?
					<ProgressBar now={this.state.progress} label={this.state.progress + '%'} />
					: null }
				<SummaryTable files={this.state.filesSelected} />
				<p>You can drag and drop files to this box.</p>
			</Well>
		</FileDroppable>;
	}
}

function SummaryTable(props) {
	const files = props.files;
	const show = 10;
	let totalSize = 0;
	if (files.length < 1) return null;
	return <table className='table table-condensed'>
		<thead>
			<tr>
				<th>File</th>
				<th className='text-right'>Size</th>
			</tr>
		</thead>
		<tbody>
			{Array.prototype.slice.call(files).map((f, i) => {
				totalSize += f.size;
				if (i >= show) return null;
				return <tr>
					<td>{f.name}</td>
					<td className='text-right'>{f.size}</td>
				</tr>;
			})}
			{ files.length > show ?
				<tr>
					<td><i>And {files.length - show} file(s)</i></td>
					<td></td>
				</tr>
				: null }
		</tbody>
		{ files.length > 1 ?
			<tfoot>
				<tr className='info'>
					<th>Total: {files.length} files</th>
					<th className='text-right'>{totalSize}</th>
				</tr>
			</tfoot>
			: null }
	</table>;
}
