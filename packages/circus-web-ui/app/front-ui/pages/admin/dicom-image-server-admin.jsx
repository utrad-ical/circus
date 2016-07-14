import React from 'react';
import { Alert, Panel, Button, ButtonToolbar, Glyphicon } from 'components/react-bootstrap';
import { Loading } from 'components/loading';
import { api } from 'utils/api';
import axios from 'axios';
import { store } from 'store';

export class DicomImageServerAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			isFetching: false,
			processStatus: <Loading />,
			rsStatus: <Loading />
		};
	}

	async sendControl(command) {
		if (this.state.isFetching) return;
		const dicomImageServer = store.getState().loginUser.data.dicomImageServer;
		this.setState({ isFetching: true, noAuthorizationWarning: false });
		const data = await api('server/' + command, { method: 'post' });
		this.setState({ processStatus: data[0] });
		try {
			const status = (await axios.get(dicomImageServer + '/status')).data;
			this.setState({
				rsStatus: JSON.stringify(status, null, '    '),
				noAuthorizationWarning: status.authorization && status.authorization.enabled === false
			});
		} catch(err) {
			let message = 'The server did not respond. It may not be running.';
			if (typeof err.state === 'number') {
				message = `The server returned with ${err.state} error.`;
			}
			this.setState({ rsStatus: <em className="text-warning">{message}</em> });
		}
		this.setState({ isFetching: false });
	}

	componentDidMount() {
		this.sendControl('status');
	}

	render() {
		const header = <div>
			Control
			{ this.state.isFetching ? <span>&ensp;<Loading /></span> : null }
		</div>;

		return <div>
			<h1><Glyphicon glyph="hdd" />&ensp;DICOM Image Server</h1>
			<Panel header={header}>
				<ButtonToolbar>
					<Button bsStyle="success" bsSize="large"
						disabled={this.state.isFetching}
						onClick={this.sendControl.bind(this, 'start')}
					>
						<Glyphicon glyph="play" />&ensp;Start
					</Button>
					<Button bsStyle="danger" bsSize="large"
						disabled={this.state.isFetching}
						onClick={this.sendControl.bind(this, 'stop')}
					>
						<Glyphicon glyph="stop" />&ensp;Stop
					</Button>
					<Button bsStyle="default" bsSize="large"
						disabled={this.state.isFetching}
						onClick={this.sendControl.bind(this, 'status')}
					>
						<Glyphicon glyph="refresh" />&ensp;Refresh
					</Button>
				</ButtonToolbar>
			</Panel>
			<div className={'server-status' + (this.state.isFetching ? ' pending' : '')}>
				<p>Process Status:</p>
				<pre>{this.state.processStatus}</pre>
				<p>CIRCUS RS Status:</p>
				<pre>{this.state.rsStatus}</pre>
				{ this.state.noAuthorizationWarning ?
					<Alert bsStyle="danger">
						<strong>RS Server running without authorization enabled!</strong>&ensp;
						This can be a security risk. Use this only for debugging purposes.
					</Alert>
				: null }
			</div>
		</div>;
	}
}
