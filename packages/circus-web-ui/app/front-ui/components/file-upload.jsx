import React from 'react';
import { Button, Glyphicon, Well } from './react-bootstrap';
import { FileDroppable } from './file-droppable';
import * as modal from 'components/modal';
import axios from 'axios';

/**
 * Styled div where use can upload one ore more files.
 * Upload progress is displayed using a progress bar,
 * and the response can be accessed via Promise.
 */
export class FileUpload extends React.Component {
	dropFile(files) {
		this.upload(files);
	}

	uploadClick() {
		this.upload(this.refs.fileInput.files);
	}

	async upload(files) {
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
		if (typeof this.props.beforeUpload === 'function') {
			this.props.beforeUpload(fd);
		}
		console.log(fd);

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
				<Well>
				{this.props.children}
				<p><input multiple={!!this.props.multiple} type="file" ref="fileInput"/></p>
				<p>
					<Button bsStyle="primary" onClick={this.uploadClick.bind(this)}>
						<Glyphicon glyph="upload" />&ensp;Upload
					</Button>
					<Button bsStyle="link">Reset</Button>
				</p>
				<p>You can drag and drop files to this box.</p>
			</Well>
		</FileDroppable>;
	}
}
