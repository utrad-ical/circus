import React from 'react';
import { Panel, Button, ButtonToolbar, Glyphicon } from 'react-bootstrap';
import { api } from 'utils/api';
import axios from 'axios';

export class DicomImageServerAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			processStatus: null,
			rsStatus: null
		};
	}

	sendControl(command) {
		api('server/start', { method: 'post' }).then(data => {
			this.setState({ processStatus: data[0] });
			console.log(data);
			if (Array.isArray(data) && /Forever processes running/i.test(data[0])) {
				console.log('running');
			}
		});
	}

	render() {
		return <div>
			<h2><Glyphicon glyph="hdd" />&ensp;DICOM Image Server</h2>
			<Panel header="Control">
				<ButtonToolbar>
					<Button bsStyle="success" bsSize="large" onClick={this.sendControl.bind(this, 'start')}>
						<Glyphicon glyph="play" />&ensp;Start
					</Button>
					<Button bsStyle="danger" bsSize="large" onClick={this.sendControl.bind(this, 'stop')}>
						<Glyphicon glyph="stop" />&ensp;Stop
					</Button>
					<Button bsStyle="default" bsSize="large" onClick={this.sendControl.bind(this, 'status')}>
						<Glyphicon glyph="refresh" />&ensp;Refresh
					</Button>
				</ButtonToolbar>
			</Panel>
			<p>Process Status:</p>
			<pre>{this.state.processStatus}</pre>
			<p>CIRCUS RS Status:</p>
			<pre>{this.state.rsStatus}</pre>
		</div>;
	}
}
