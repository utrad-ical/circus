import React from 'react';
import { Well, Button, Glyphicon } from 'components/react-bootstrap';
import { ShrinkSelect } from 'components/shrink-select';
import { connect } from 'react-redux';
import * as modal from 'components/modal';
import { TaskProgress, TaskWatcher } from 'components/task-watcher';
import { FileDroppable } from 'components/file-droppable';

class ImportSeriesView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			uploadDomain: this.props.loginUser ? this.props.loginUser.defaultDomain : '',
		};
	}

	domainChange(domain) {
		this.setState({ uploadDomain: domain });
	}

	componentWillReceiveProps(props) {
		if (this.state.uploadDomain === '' && props.loginUser) {
			this.setState({ uploadDomain: props.loginUser.defaultDomain });
		}
	}

	dragEnter(event) {
		event.preventDefault();
	}

	drop(files) {
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
		const uploadFileMax = this.props.loginUser.uploadFileMax;
		if (num > uploadFileMax) {
			modal.alert(
				'Sorry, you can not upload more than ' + max_file_uploads +
				' files at the same time.\n' +
				'Use a zipped file, or consult the server administrator ' +
				'if they can modify the current limitation.');
			return;
		}
		if (!(await modal.confirm(`Do you want to upload ${prompt} (${size} bytes)`))) {
			return;
		}

		fd.append('domain', this.state.uploadDomain);
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
		if (!this.props.loginUser) return <div />;
		const user = this.props.loginUser;
		return <div>
			<h1><span className="circus-icon-series-import" /> Series Import</h1>
			<p>
				Choose DICOM files to upload.
				(Maximum size: {user.uploadFileSizeMax},
				up to {user.uploadFileMax} files).
			</p>
			<p>Zipped DICOM files are also supported.</p>
			<FileDroppable onDropFile={this.drop.bind(this)}>
				<Well>
					<p>Upload Domain:&ensp;
						<ShrinkSelect options={user.accessibleDomains}
							value={this.state.uploadDomain}
							onChange={this.domainChange.bind(this)}/>
					</p>
					<p><input multiple type="file" ref="fileInput"/></p>
					<p>
						<Button bsStyle="primary" onClick={this.uploadClick.bind(this)}>
							<Glyphicon glyph="upload" />&ensp;Upload
						</Button>
						<Button bsStyle="link">Reset</Button>
					</p>
					<p>You can drag and drop files to this box.</p>
				</Well>
			</FileDroppable>
		</div>;
	}
}

export const ImportSeries = connect(
	state => ({ loginUser: state.loginUser.data })
)(ImportSeriesView);
