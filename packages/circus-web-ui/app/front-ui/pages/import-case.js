import React from 'react';
import { FileUpload } from 'components/file-upload';

export class ImportCase extends React.Component {
	render() {
		return <div>
			<h1><span className='circus-icon-case' />Case Import</h1>
			<FileUpload multiple={false}>
				<p>Upload a case archive file.</p>
			</FileUpload>
		</div>;
	}
}
