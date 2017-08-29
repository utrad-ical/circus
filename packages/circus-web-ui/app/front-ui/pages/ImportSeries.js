import React from 'react';
import { Alert } from 'components/react-bootstrap';
import { ShrinkSelect } from 'components/shrink-select';
import { connect } from 'react-redux';
import { FileUpload } from 'components/file-upload';

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

	uploaded() {
		// console.log(res);
	}

	render() {
		const user = this.props.loginUser;

		if (!Array.isArray(user.accessibleDomains) || user.accessibleDomains.length === 0) {
			return <Alert bsStyle='warning'>
				You do not belong to any domain. Uploading is not allowed.
			</Alert>;
		}

		return <div>
			<h1><span className='circus-icon-series-import' /> Series Import</h1>
			<p>
				Choose DICOM files to upload.
				(Maximum size: {user.uploadFileSizeMax},
				up to {user.uploadFileMax} files).
			</p>
			<p>Zipped DICOM files are also supported.</p>
			<FileUpload multiple={true} targetResource='import-series'
				uploadFileMax={user.uploadFileMax}
				uploadFileSizeMax={user.uploadFileSizeMax}
				url='/test'
				onUploaded={this.uploaded.bind(this)}
			>
				<p>Upload Domain:&ensp;
					<ShrinkSelect options={user.accessibleDomains}
						value={this.state.uploadDomain}
						onChange={this.domainChange.bind(this)}
					/>
				</p>
			</FileUpload>
		</div>;
	}
}

const ImportSeries = connect(
	state => ({ loginUser: state.loginUser.data })
)(ImportSeriesView);

export default ImportSeries;