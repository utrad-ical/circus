import React from 'react';
import { Well, Button, Glyphicon } from './react-bootstrap';
import { ShrinkSelect } from './shrink-select';

export class ImportSeries extends React.Component {
	render() {
		return <div>
			<h1><span className="circus-icon-series-import" /> Series Import</h1>
			<p>
				Choose DICOM files to upload (Maximum size: xx G, up to xx files).
			</p>
			<p>You can select more than one file at a time.</p>
			<p>Zipped DICOM files are also supported.</p>
			<div draggable>
				<Well droppable>
					<p>Upload Domain: <ShrinkSelect options={['a']} /></p>
					<p><input type="file" /></p>
					<p>
						<Button bsStyle="primary">
							<Glyphicon glyph="upload" />&ensp;Upload
						</Button>
						<Button bsStyle="link">Reset</Button>
					</p>
					<p>You can drag and drop files to this box.</p>
				</Well>
			</div>

		</div>;
	}
}
